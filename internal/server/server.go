package server

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/wii/mdserve/internal/tag"
	"github.com/wii/mdserve/internal/watcher"
)

//go:embed static/*
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
	Path       string
	Host       string
	Port       int
	SiteName   string
	DefaultDoc string
	Menu       []MenuItem
}

// Server represents the markdown server
type Server struct {
	config     *Config
	router     *gin.Engine
	watcher    *watcher.Watcher
	hub        *WebSocketHub
	rootPath   string
	tagIndexer *tag.Indexer
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
	// Resolve absolute path
	absPath, err := filepath.Abs(config.Path)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve path: %w", err)
	}

	// Check if path exists
	info, err := os.Stat(absPath)
	if err != nil {
		return nil, fmt.Errorf("path does not exist: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("path is not a directory: %s", absPath)
	}

	// Set Gin to release mode
	gin.SetMode(gin.ReleaseMode)

	// Create router
	router := gin.New()
	router.Use(gin.Recovery())

	// Create WebSocket hub
	hub := NewWebSocketHub()
	go hub.Run()

	// Create file watcher
	w, err := watcher.New(absPath,
		// File change callback - reload specific file
		func(path string) {
			relPath, _ := filepath.Rel(absPath, path)
			message := fmt.Sprintf(`{"type":"reload","path":"%s"}`, relPath)
			hub.broadcast <- message
		},
		// Tree change callback - reload file tree
		func() {
			message := `{"type":"tree_reload"}`
			hub.broadcast <- message
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create watcher: %w", err)
	}

	// Create tag indexer
	tagIndexer := tag.NewIndexer(absPath)
	if err := tagIndexer.Build(); err != nil {
		// Log warning but don't fail - tag indexing is optional
		fmt.Printf("[WARN] Failed to build tag index: %v\n", err)
	}

	server := &Server{
		config:     config,
		router:     router,
		watcher:    w,
		hub:        hub,
		rootPath:   absPath,
		tagIndexer: tagIndexer,
	}

	// Setup routes
	server.setupRoutes()

	return server, nil
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
		api.GET("/search", s.handleSearch)
		api.GET("/config", s.handleGetConfig)
		api.GET("/menu", s.handleGetMenu)
		api.GET("/tags", s.handleGetTags)
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
	files, err := s.scanDirectory(s.rootPath, s.rootPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"files": files})
}

func (s *Server) scanDirectory(path, root string) ([]FileInfo, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		// Skip hidden files
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		fullPath := filepath.Join(path, entry.Name())
		relPath, _ := filepath.Rel(root, fullPath)

		if entry.IsDir() {
			// Scan subdirectory
			children, err := s.scanDirectory(fullPath, root)
			if err != nil {
				continue
			}
			// Only include directory if it has children
			if len(children) > 0 {
				files = append(files, FileInfo{
					Name:     entry.Name(),
					Path:     relPath,
					Type:     "directory",
					Children: children,
				})
			}
		} else if strings.HasSuffix(strings.ToLower(entry.Name()), ".md") {
			files = append(files, FileInfo{
				Name: entry.Name(),
				Path: relPath,
				Type: "file",
			})
		}
	}

	return files, nil
}
