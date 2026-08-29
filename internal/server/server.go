package server

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	apipkg "github.com/wii/mdserve/internal/api"
	"github.com/wii/mdserve/internal/diagram"
	"github.com/wii/mdserve/internal/docs"
	"github.com/wii/mdserve/internal/ignore"
	mcppkg "github.com/wii/mdserve/internal/mcp"
	"github.com/wii/mdserve/internal/tag"
	"github.com/wii/mdserve/internal/watcher"
)

//go:embed all:static
var staticFS embed.FS

// MenuItem represents a menu item for the server
type MenuItem struct {
	Title    string     `json:"title"`
	Children []MenuItem `json:"children,omitempty"`
	Type     string     `json:"type,omitempty"`
	Path     string     `json:"path,omitempty"`
	Tag      string     `json:"tag,omitempty"`
}

// Config holds server configuration
type Config struct {
	Path           string
	Host           string
	Port           int
	SiteName       string
	DefaultDoc     string
	Footer         string
	Menu           []MenuItem
	IgnorePatterns []string
	// Diagrams configures the optional Kroki rendering gateway.
	KrokiEnabled      bool
	KrokiURL          string
	KrokiTimeout      time.Duration
	KrokiCacheVersion int
	// MCPEnabled controls whether the /mcp HTTP endpoint is mounted.
	MCPEnabled bool
	// Version is the server build version, surfaced in MCP serverInfo.
	Version string
}

// Server represents the markdown server
type Server struct {
	config        *Config
	router        *gin.Engine
	watcher       *watcher.Watcher
	hub           *WebSocketHub
	rootPath      string
	tagIndexer    *tag.Indexer
	ignoreMatcher *ignore.Matcher
	diagramCache  *diagram.Cache
	library       *docs.Library
	treeCache     *docs.TreeCache

	treeReloadMu    sync.Mutex
	treeReloadTimer *time.Timer
}

// WebSocketHub manages WebSocket connections
type WebSocketHub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan string
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan string, 256),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

// Run starts the WebSocket hub
func (h *WebSocketHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, []byte(message))
				if err != nil {
					delete(h.clients, client)
					client.Close()
				}
			}
		}
	}
}

// New creates a new server instance
func New(config *Config) (*Server, error) {
	// Build the shared docs library: validates the path, builds the tag index,
	// and owns path resolution / read / search logic shared with the MCP layer.
	library, err := docs.New(config.Path, config.IgnorePatterns)
	if err != nil {
		return nil, err
	}
	absPath := library.RootPath()

	// Set Gin to release mode
	gin.SetMode(gin.ReleaseMode)

	// Create router
	router := gin.New()
	router.Use(gin.Recovery())

	// Create WebSocket hub
	hub := NewWebSocketHub()
	go hub.Run()

	treeCache := docs.NewTreeCache(library)
	if err := treeCache.Rebuild(); err != nil {
		fmt.Printf("[WARN] Initial file tree cache build failed: %v\n", err)
	}

	server := &Server{
		config:        config,
		router:        router,
		hub:           hub,
		rootPath:      absPath,
		tagIndexer:    library.TagIndexer(),
		ignoreMatcher: library.IgnoreMatcher(),
		library:       library,
		treeCache:     treeCache,
	}

	// Create file watcher
	w, err := watcher.New(absPath,
		// File change callback - reload specific file
		func(path string) {
			relPath, _ := filepath.Rel(absPath, path)
			message := fmt.Sprintf(`{"type":"reload","path":"%s"}`, relPath)
			hub.broadcast <- message
		},
		// Tree change: debounce cache rebuild, then notify clients
		func() {
			server.scheduleTreeCacheRebuild()
		},
		config.IgnorePatterns,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create watcher: %w", err)
	}
	server.watcher = w

	// Build the diagram cache. Always initialize it (even when Kroki is
	// disabled) so the directory exists; failures are fatal per the spec
	// because a half-working cache is worse than a clean start.
	diagramCache := diagram.NewCache(absPath, config.KrokiCacheVersion)
	if err := diagramCache.Init(); err != nil {
		return nil, fmt.Errorf("init diagram cache: %w", err)
	}
	server.diagramCache = diagramCache

	// Setup routes
	server.setupRoutes()

	return server, nil
}

const treeCacheDebounce = 200 * time.Millisecond

// scheduleTreeCacheRebuild debounces watcher-driven rebuilds, then broadcasts
// tree_reload so clients refetch against the updated cache.
func (s *Server) scheduleTreeCacheRebuild() {
	s.treeReloadMu.Lock()
	defer s.treeReloadMu.Unlock()
	if s.treeReloadTimer != nil {
		s.treeReloadTimer.Stop()
	}
	s.treeReloadTimer = time.AfterFunc(treeCacheDebounce, func() {
		if err := s.treeCache.Rebuild(); err != nil {
			fmt.Printf("[WARN] Debounced file tree cache rebuild failed: %v\n", err)
		}
		s.hub.broadcast <- `{"type":"tree_reload"}`
	})
}

// Start starts the server
func (s *Server) Start() error {
	// Start file watcher
	s.watcher.Start()
	defer s.watcher.Stop()

	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	return s.router.Run(addr)
}

func (s *Server) setupRoutes() {
	// API routes
	api := s.router.Group("/api")
	{
		api.GET("/files", s.handleGetFiles)
		api.GET("/file", s.handleGetFile)
		api.GET("/asset", s.handleGetAsset)
		api.GET("/asset/*filepath", s.handleGetAsset)
		api.GET("/search", s.handleSearch)
		api.GET("/config", s.handleGetConfig)
		api.GET("/menu", s.handleGetMenu)
		api.GET("/tags", s.handleGetTags)
	}

	// Diagram rendering proxy (POST /api/diagram).
	var krokiClient *diagram.KrokiClient
	if s.config.KrokiEnabled {
		krokiClient = diagram.NewKrokiClient(s.config.KrokiURL, s.config.KrokiTimeout)
	}
	diagramHandler := apipkg.NewDiagramHandler(apipkg.DiagramDeps{
		Enabled: s.config.KrokiEnabled,
		Client:  krokiClient,
		Cache:   s.diagramCache,
	})
	diagramHandler.Register(s.router.Group("/api"))

	// MCP (Model Context Protocol) Streamable HTTP endpoint.
	// Read-only tools over the same docs library; disabled only when the user
	// explicitly sets mcp.enabled=false. The stdio subcommand is unaffected.
	if s.config.MCPEnabled {
		mcpServer := mcppkg.NewServer(s.library, "mdserve", s.config.Version)
		mcpHandler := mcppkg.NewHTTPHandler(mcpServer)
		mcpHandler.Register(s.router.Group(""))
	} else {
		// When disabled, register explicit 404s so the SPA NoRoute handler does
		// not shadow the endpoint and masquerade as a working MCP server.
		notFound := func(c *gin.Context) { c.JSON(http.StatusNotFound, gin.H{"error": "mcp disabled"}) }
		s.router.POST("/mcp", notFound)
		s.router.GET("/mcp", notFound)
		s.router.DELETE("/mcp", notFound)
	}

	// WebSocket route
	s.router.GET("/ws", s.handleWebSocket)

	// Static files
	s.setupStaticFiles()
}

func (s *Server) setupStaticFiles() {
	// Get static subdirectory from embedded FS
	staticContent, err := fs.Sub(staticFS, "static")
	if err != nil {
		panic(err)
	}

	// Serve assets
	s.router.GET("/assets/*filepath", func(c *gin.Context) {
		c.FileFromFS(c.Request.URL.Path, http.FS(staticContent))
	})

	// Serve index.html for all other routes (SPA support)
	s.router.NoRoute(func(c *gin.Context) {
		// Check if requesting a specific file with extension
		if filepath.Ext(c.Request.URL.Path) != "" {
			// Try to serve from static
			c.FileFromFS(c.Request.URL.Path, http.FS(staticContent))
			return
		}
		// Serve index.html for SPA routes
		data, err := staticFS.ReadFile("static/index.html")
		if err != nil {
			c.String(http.StatusInternalServerError, "Failed to read index.html")
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})
}

// FileInfo represents a file or directory
type FileInfo struct {
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Type     string     `json:"type"`
	Children []FileInfo `json:"children,omitempty"`
}

func (s *Server) handleGetFiles(c *gin.Context) {
	reqPath := c.Query("path")
	depthStr := c.Query("depth")

	var (
		libFiles []docs.FileInfo
		err      error
	)

	// No query params: full tree from cache (compatible with existing clients).
	if reqPath == "" && depthStr == "" {
		libFiles, err = s.treeCache.Get()
	} else {
		depth := 0
		if depthStr != "" {
			depth, err = strconv.Atoi(depthStr)
			if err != nil || depth < 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid depth"})
				return
			}
		}
		libFiles, err = s.listFilesAt(reqPath, depth)
	}

	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, docs.ErrNotFound) || errors.Is(err, docs.ErrInvalidPath) {
			status = http.StatusNotFound
		} else if errors.Is(err, docs.ErrAccessDenied) {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"files": convertFileInfos(libFiles)})
}

// listFilesAt prefers a cache slice when ready; otherwise falls back to a live
// ListTreeAt scan (shallow depth=1 does not wait on a full rebuild).
func (s *Server) listFilesAt(path string, depth int) ([]docs.FileInfo, error) {
	if files, err, ok := s.treeCache.Slice(path, depth); ok {
		return files, err
	}
	return s.library.ListTreeAt(path, depth)
}

// scanDirectory scans the directory tree. It delegates to the shared docs
// library and maps the result into the server's FileInfo type (kept for
// JSON-shape stability with the existing API). The (path, root) params are
// retained for signature compatibility; only the root scan is used today.
func (s *Server) scanDirectory(_, _ string) ([]FileInfo, error) {
	libFiles, err := s.treeCache.Get()
	if err != nil {
		return nil, err
	}
	return convertFileInfos(libFiles), nil
}

// convertFileInfos maps docs.FileInfo → server.FileInfo recursively.
func convertFileInfos(in []docs.FileInfo) []FileInfo {
	out := make([]FileInfo, len(in))
	for i, f := range in {
		out[i] = FileInfo{
			Name:     f.Name,
			Path:     f.Path,
			Type:     f.Type,
			Children: convertFileInfos(f.Children),
		}
	}
	return out
}
