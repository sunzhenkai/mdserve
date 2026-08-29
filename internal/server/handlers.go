package server

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/wii/mdserve/internal/docs"
)

// Thin wrappers over the shared docs package, kept so existing tests that
// reference them by name keep compiling.
func isBrowsableDocument(name string) bool  { return docs.IsBrowsableDocument(name) }
func isSearchableDocument(name string) bool { return docs.IsSearchableDocument(name) }
func detectFileFormat(name string) string   { return docs.DetectFileFormat(name) }
func stripHTMLForSearch(content string) string {
	return docs.StripHTMLForSearch(content)
}

func (s *Server) handleGetFile(c *gin.Context) {
	requestPath := c.Query("path")
	if requestPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path parameter is required"})
		return
	}

	res, err := s.library.ReadDoc(requestPath)
	if err != nil {
		switch {
		case errors.Is(err, docs.ErrInvalidPath):
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		case errors.Is(err, docs.ErrAccessDenied):
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		case errors.Is(err, docs.ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	response := gin.H{
		"content":      res.Content,
		"format":       res.Format,
		"resolvedPath": res.ResolvedPath,
		"outline":      res.Outline,
	}
	if res.Tags != nil {
		response["tags"] = res.Tags
	}
	if res.Categories != nil {
		response["categories"] = res.Categories
	}
	c.JSON(http.StatusOK, response)
}

func (s *Server) handleGetAsset(c *gin.Context) {
	requestPath := c.Query("path")
	basePath := c.Query("base")
	if requestPath == "" {
		// Path form: /api/asset/guides/hero.png — so relative URLs in standalone
		// HTML resolve next to the document instead of /api/<file>.
		requestPath = strings.TrimPrefix(c.Param("filepath"), "/")
		basePath = ""
	}
	if requestPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path parameter is required"})
		return
	}

	relPath, ok := s.library.ResolvePath(requestPath, basePath)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	fullPath, ok := s.library.AbsolutePath(relPath)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Check if asset is ignored
	if s.ignoreMatcher.ShouldIgnoreFile(relPath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "asset not found"})
		return
	}

	info, err := os.Stat(fullPath)
	if err != nil || info.IsDir() {
		c.JSON(http.StatusNotFound, gin.H{"error": "asset not found"})
		return
	}

	c.File(fullPath)
}

// SearchResult represents a search result
type SearchResult struct {
	Path    string   `json:"path"`
	Name    string   `json:"name"`
	Matches []string `json:"matches"`
}

func (s *Server) handleSearch(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, gin.H{"results": []SearchResult{}})
		return
	}

	libResults, err := s.library.Search(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	results := make([]SearchResult, len(libResults))
	for i, r := range libResults {
		results[i] = SearchResult{
			Path:    r.Path,
			Name:    r.Name,
			Matches: r.Matches,
		}
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}

// handleGetConfig returns the server configuration for the frontend
func (s *Server) handleGetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"siteName":     s.config.SiteName,
		"defaultDoc":   s.config.DefaultDoc,
		"footer":       s.config.Footer,
		"krokiEnabled": s.config.KrokiEnabled,
		"krokiUrl":     s.config.KrokiURL,
	})
}

// handleGetMenu returns the menu configuration
func (s *Server) handleGetMenu(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"menu": s.config.Menu,
	})
}

// handleGetTags returns all tags and categories with their associated documents
func (s *Server) handleGetTags(c *gin.Context) {
	if s.tagIndexer == nil {
		c.JSON(http.StatusOK, gin.H{
			"tags":       map[string][]string{},
			"categories": map[string][]string{},
		})
		return
	}

	tags := s.tagIndexer.GetTags()
	categories := s.tagIndexer.GetCategories()
	c.JSON(http.StatusOK, gin.H{
		"tags":       tags,
		"categories": categories,
	})
}
