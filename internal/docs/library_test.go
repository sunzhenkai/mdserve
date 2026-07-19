package docs

import (
	"os"
	"path/filepath"
	"testing"
)

func newLib(t *testing.T) (*Library, string) {
	t.Helper()
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "docs"), 0o755); err != nil {
		t.Fatalf("mkdir docs: %v", err)
	}
	lib, err := New(root, nil)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return lib, root
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
			if got := DetectFileFormat(tt.name); got != tt.want {
				t.Fatalf("DetectFileFormat(%q) = %q, want %q", tt.name, got, tt.want)
			}
		})
	}
}

func TestStripHTMLForSearch(t *testing.T) {
	input := `<style>.hidden{display:none}</style><h1>Title</h1><script>secret()</script><p>Visible text</p>`
	got := StripHTMLForSearch(input)
	if got != "Title Visible text" {
		t.Fatalf("StripHTMLForSearch() = %q, want %q", got, "Title Visible text")
	}
}

func TestReadDoc_HTMLFormat(t *testing.T) {
	lib, root := newLib(t)
	html := "<h1>Report</h1><script>alert(1)</script>"
	if err := os.WriteFile(filepath.Join(root, "report.html"), []byte(html), 0o644); err != nil {
		t.Fatalf("write html: %v", err)
	}
	res, err := lib.ReadDoc("report.html")
	if err != nil {
		t.Fatalf("ReadDoc: %v", err)
	}
	if res.Format != "html" {
		t.Fatalf("format = %v, want html", res.Format)
	}
	if res.Content != html {
		t.Fatalf("unexpected content: %v", res.Content)
	}
	if res.ResolvedPath != "report.html" {
		t.Fatalf("resolvedPath = %v", res.ResolvedPath)
	}
}

func TestReadDoc_MarkdownFormat(t *testing.T) {
	lib, root := newLib(t)
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("# Title\n\nBody"), 0o644); err != nil {
		t.Fatalf("write md: %v", err)
	}
	res, err := lib.ReadDoc("README.md")
	if err != nil {
		t.Fatalf("ReadDoc: %v", err)
	}
	if res.Format != "markdown" {
		t.Fatalf("format = %v, want markdown", res.Format)
	}
	if len(res.Outline) != 1 || res.Outline[0].Text != "Title" {
		t.Fatalf("outline = %+v", res.Outline)
	}
}

func TestReadDoc_DirectoryIndexHTMLFallback(t *testing.T) {
	lib, root := newLib(t)
	dir := filepath.Join(root, "docs")
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>Index</h1>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}
	res, err := lib.ReadDoc("docs")
	if err != nil {
		t.Fatalf("ReadDoc: %v", err)
	}
	if res.Format != "html" {
		t.Fatalf("format = %v, want html", res.Format)
	}
	if res.ResolvedPath != "docs/index.html" {
		t.Fatalf("resolvedPath = %v", res.ResolvedPath)
	}
}

func TestReadDoc_READMEPriorityOverIndexHTML(t *testing.T) {
	lib, root := newLib(t)
	dir := filepath.Join(root, "docs")
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("# Readme"), 0o644); err != nil {
		t.Fatalf("write README.md: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>Index</h1>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}
	res, err := lib.ReadDoc("docs")
	if err != nil {
		t.Fatalf("ReadDoc: %v", err)
	}
	if res.Format != "markdown" {
		t.Fatalf("format = %v, want markdown", res.Format)
	}
	if res.ResolvedPath != "docs/README.md" {
		t.Fatalf("resolvedPath = %v, want res.ResolvedPath", res.ResolvedPath)
	}
}

func TestReadDoc_PathTraversalRejected(t *testing.T) {
	lib, _ := newLib(t)
	if _, err := lib.ReadDoc("../../etc/passwd"); err != ErrAccessDenied && err != ErrInvalidPath {
		t.Fatalf("expected ErrAccessDenied/ErrInvalidPath, got %v", err)
	}
}

func TestSearch_HTMLContent(t *testing.T) {
	lib, root := newLib(t)
	html := `<html><head><style>.x{}</style></head><body><h1>Alpha</h1><script>ignore me</script><p>UniqueKeyword123</p></body></html>`
	if err := os.WriteFile(filepath.Join(root, "page.html"), []byte(html), 0o644); err != nil {
		t.Fatalf("write html: %v", err)
	}
	results, err := lib.Search("uniquekeyword123")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(results) != 1 || results[0].Path != "page.html" {
		t.Fatalf("unexpected results: %+v", results)
	}
}

func TestSearch_EmptyQueryReturnsEmpty(t *testing.T) {
	lib, _ := newLib(t)
	results, err := lib.Search("")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected empty, got %+v", results)
	}
}

func TestListTree_OmitsHiddenAndEmpty(t *testing.T) {
	lib, root := newLib(t)
	if err := os.WriteFile(filepath.Join(root, "visible.md"), []byte("# v"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".hidden.md"), []byte("# h"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	tree, err := lib.ListTree()
	if err != nil {
		t.Fatalf("ListTree: %v", err)
	}
	if len(tree) != 1 || tree[0].Name != "visible.md" {
		t.Fatalf("unexpected tree: %+v", tree)
	}
}

func TestResolvePath_BaseRelative(t *testing.T) {
	lib, _ := newLib(t)
	// Document at guide/getting-started.md references assets/logo.png;
	// base-relative resolution should land in guide/assets/logo.png.
	rel, ok := lib.ResolvePath("assets/logo.png", "guide/getting-started.md")
	if !ok {
		t.Fatalf("expected ok")
	}
	if rel != "guide/assets/logo.png" {
		t.Fatalf("rel = %q, want guide/assets/logo.png", rel)
	}
}
