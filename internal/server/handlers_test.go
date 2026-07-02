package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupTestServer(t *testing.T) (*Server, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "docs"), 0o755); err != nil {
		t.Fatalf("mkdir docs: %v", err)
	}

	s, err := New(&Config{Path: root, Host: "127.0.0.1", Port: 0})
	if err != nil {
		t.Fatalf("New server: %v", err)
	}
	return s, root
}

func getFile(t *testing.T, s *Server, path string) map[string]any {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/file?path="+path, nil)
	s.handleGetFile(c)

	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/file?path=%s status = %d, body = %s", path, w.Code, w.Body.String())
	}

	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return resp
}

func TestDetectFileFormat(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{"readme.md", "markdown"},
		{"page.HTML", "html"},
		{"index.htm", "html"},
		{"notes.txt", "markdown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := detectFileFormat(tt.name); got != tt.want {
				t.Fatalf("detectFileFormat(%q) = %q, want %q", tt.name, got, tt.want)
			}
		})
	}
}

func TestHandleGetFile_HTMLFormat(t *testing.T) {
	s, root := setupTestServer(t)
	htmlPath := filepath.Join(root, "report.html")
	if err := os.WriteFile(htmlPath, []byte("<h1>Report</h1><script>alert(1)</script>"), 0o644); err != nil {
		t.Fatalf("write html: %v", err)
	}

	resp := getFile(t, s, "report.html")
	if resp["format"] != "html" {
		t.Fatalf("format = %v, want html", resp["format"])
	}
	if resp["content"] != "<h1>Report</h1><script>alert(1)</script>" {
		t.Fatalf("unexpected content: %v", resp["content"])
	}
	if resp["resolvedPath"] != "report.html" {
		t.Fatalf("resolvedPath = %v", resp["resolvedPath"])
	}
}

func TestHandleGetFile_MarkdownFormat(t *testing.T) {
	s, root := setupTestServer(t)
	mdPath := filepath.Join(root, "README.md")
	if err := os.WriteFile(mdPath, []byte("# Title\n\nBody"), 0o644); err != nil {
		t.Fatalf("write md: %v", err)
	}

	resp := getFile(t, s, "README.md")
	if resp["format"] != "markdown" {
		t.Fatalf("format = %v, want markdown", resp["format"])
	}
}

func TestHandleGetFile_DirectoryIndexHTMLFallback(t *testing.T) {
	s, root := setupTestServer(t)
	dir := filepath.Join(root, "docs")
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>Index</h1>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}

	resp := getFile(t, s, "docs")
	if resp["format"] != "html" {
		t.Fatalf("format = %v, want html", resp["format"])
	}
	if resp["resolvedPath"] != "docs/index.html" {
		t.Fatalf("resolvedPath = %v, want docs/index.html", resp["resolvedPath"])
	}
}

func TestHandleGetFile_READMEPriorityOverIndexHTML(t *testing.T) {
	s, root := setupTestServer(t)
	dir := filepath.Join(root, "docs")
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("# Readme"), 0o644); err != nil {
		t.Fatalf("write README.md: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>Index</h1>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}

	resp := getFile(t, s, "docs")
	if resp["format"] != "markdown" {
		t.Fatalf("format = %v, want markdown", resp["format"])
	}
	if resp["resolvedPath"] != "docs/README.md" {
		t.Fatalf("resolvedPath = %v, want docs/README.md", resp["resolvedPath"])
	}
}

func TestHandleSearch_HTMLContent(t *testing.T) {
	s, root := setupTestServer(t)
	html := `<html><head><style>.x{}</style></head><body><h1>Alpha</h1><script>ignore me</script><p>UniqueKeyword123</p></body></html>`
	if err := os.WriteFile(filepath.Join(root, "page.html"), []byte(html), 0o644); err != nil {
		t.Fatalf("write html: %v", err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/search?q=uniquekeyword123", nil)
	s.handleSearch(c)

	if w.Code != http.StatusOK {
		t.Fatalf("search status = %d", w.Code)
	}

	var resp struct {
		Results []SearchResult `json:"results"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode search response: %v", err)
	}
	if len(resp.Results) != 1 || resp.Results[0].Path != "page.html" {
		t.Fatalf("unexpected search results: %+v", resp.Results)
	}
}

func TestStripHTMLForSearch(t *testing.T) {
	input := `<style>.hidden{display:none}</style><h1>Title</h1><script>secret()</script><p>Visible text</p>`
	got := stripHTMLForSearch(input)
	if got != "Title Visible text" {
		t.Fatalf("stripHTMLForSearch() = %q, want %q", got, "Title Visible text")
	}
}
