package server

import (
	"bufio"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/wii/mdserve/internal/markdown"
)

func (s *Server) resolveRequestPath(rawPath, rawBase string) (string, bool) {
	requested := strings.TrimSpace(strings.ReplaceAll(rawPath, "\\", "/"))
	if requested == "" {
		return "", false
	}

	isRootRelative := strings.HasPrefix(requested, "/")
	requested = strings.TrimLeft(requested, "/")
	requested = path.Clean(requested)
	if requested == "." || requested == ".." || strings.HasPrefix(requested, "../") {
		return "", false
	}

	resolved := requested
	if !isRootRelative && strings.TrimSpace(rawBase) != "" {
		base := strings.TrimSpace(strings.ReplaceAll(rawBase, "\\", "/"))
		base = strings.TrimLeft(base, "/")
		base = path.Clean(base)
		if base == ".." || strings.HasPrefix(base, "../") {
			return "", false
		}
		baseDir := path.Dir(base)
		if baseDir == "." {
			baseDir = ""
		}
		if baseDir != "" {
			resolved = path.Clean(baseDir + "/" + requested)
		}
	}

	if resolved == "." || resolved == ".." || strings.HasPrefix(resolved, "../") {
		return "", false
	}
	return resolved, true
}

func (s *Server) toAbsolutePath(relPath string) (string, bool) {
	fullPath := filepath.Join(s.rootPath, filepath.FromSlash(relPath))
	rel, err := filepath.Rel(s.rootPath, fullPath)
	if err != nil {
		return "", false
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return "", false
	}
	return fullPath, true
}

func (s *Server) handleGetFile(c *gin.Context) {
	requestPath := c.Query("path")
	if requestPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path parameter is required"})
		return
	}

	relPath, ok := s.resolveRequestPath(requestPath, "")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	fullPath, ok := s.toAbsolutePath(relPath)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Read file
	content, err := os.ReadFile(fullPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	contentStr := string(content)

	// Extract frontmatter
	frontMatter, cleanContent := markdown.ExtractFrontMatter(contentStr)

	// Parse outline from clean content (without frontmatter)
	outline := markdown.ExtractOutline(cleanContent)

	response := gin.H{
		"content": cleanContent,
		"outline": outline,
	}

	// Add frontmatter data if exists
	if frontMatter != nil {
		response["tags"] = frontMatter.Tags
		response["categories"] = frontMatter.Categories
	}

	c.JSON(http.StatusOK, response)
}

func (s *Server) handleGetAsset(c *gin.Context) {
	requestPath := c.Query("path")
	basePath := c.Query("base")
	if requestPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path parameter is required"})
		return
	}

	relPath, ok := s.resolveRequestPath(requestPath, basePath)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	fullPath, ok := s.toAbsolutePath(relPath)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
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

	query = strings.ToLower(query)
	var results []SearchResult

	// Walk through all markdown files
	err := filepath.Walk(s.rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// Skip hidden files
		if strings.HasPrefix(info.Name(), ".") {
			return nil
		}

		// Only search markdown files
		if !strings.HasSuffix(strings.ToLower(info.Name()), ".md") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		contentStr := string(content)

		var matches []string
		relPath, _ := filepath.Rel(s.rootPath, path)

		// Check filename
		if strings.Contains(strings.ToLower(info.Name()), query) {
			matches = append(matches, "文件名匹配")
		}

		// Search in content
		scanner := bufio.NewScanner(strings.NewReader(contentStr))
		lineNum := 0
		for scanner.Scan() {
			lineNum++
			line := scanner.Text()
			if strings.Contains(strings.ToLower(line), query) {
				// Extract matching context
				context := extractContext(line, query)
				if len(matches) < 5 { // Limit matches per file
					matches = append(matches, context)
				}
			}
		}

		// Also search in headings
		headings := markdown.ExtractOutline(contentStr)
		for _, h := range headings {
			if strings.Contains(strings.ToLower(h.Text), query) {
				matches = append(matches, "标题: "+h.Text)
			}
		}

		if len(matches) > 0 {
			results = append(results, SearchResult{
				Path:    relPath,
				Name:    info.Name(),
				Matches: matches,
			})
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Limit results
	if len(results) > 50 {
		results = results[:50]
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// extractContext extracts a context around the match
func extractContext(line, query string) string {
	line = strings.TrimSpace(line)
	if len(line) > 100 {
		// Find match position
		idx := strings.Index(strings.ToLower(line), strings.ToLower(query))
		if idx == -1 {
			return line[:97] + "..."
		}

		// Extract context around match
		start := idx - 30
		if start < 0 {
			start = 0
		}
		end := idx + len(query) + 30
		if end > len(line) {
			end = len(line)
		}

		context := line[start:end]
		if start > 0 {
			context = "..." + context
		}
		if end < len(line) {
			context = context + "..."
		}
		return context
	}
	return line
}

// handleGetConfig returns the server configuration for the frontend
func (s *Server) handleGetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"siteName":   s.config.SiteName,
		"defaultDoc": s.config.DefaultDoc,
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
