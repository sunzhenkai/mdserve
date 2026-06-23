package diagram

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestCache_PathLayout(t *testing.T) {
	dir := t.TempDir()
	c := NewCache(dir, 1)
	wantSuffix := filepath.Join(".mdserve", "cache", "diagrams", "1", "d2")
	if !strings.HasSuffix(filepath.Dir(c.pathFor("d2", "x")), wantSuffix) {
		t.Errorf("cache dir = %q, want suffix %q", filepath.Dir(c.pathFor("d2", "x")), wantSuffix)
	}
}

func TestCache_Init_CreatesDir(t *testing.T) {
	dir := t.TempDir()
	c := NewCache(dir, 1)
	if err := c.Init(); err != nil {
		t.Fatalf("Init error: %v", err)
	}
	info, err := os.Stat(c.Root())
	if err != nil {
		t.Fatalf("cache root not created: %v", err)
	}
	if !info.IsDir() {
		t.Fatalf("cache root is not a directory")
	}
}

func TestCache_Init_NotWritable(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("permission-based writability test is unreliable on Windows")
	}
	if os.Geteuid() == 0 {
		t.Skip("running as root bypasses permission checks")
	}
	dir := t.TempDir()
	// Make work dir read-only so MkdirAll under it fails.
	if err := os.Chmod(dir, 0555); err != nil {
		t.Fatalf("chmod: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(dir, 0755) })

	c := NewCache(filepath.Join(dir, "sub", "tree"), 1)
	err := c.Init()
	if err == nil {
		t.Fatalf("Init should fail on read-only work dir")
	}
}

func TestCache_SetGet_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	c := NewCache(dir, 1)
	if err := c.Init(); err != nil {
		t.Fatalf("Init: %v", err)
	}

	// Miss before set.
	got, hit, err := c.Get("d2", "A -> B")
	if err != nil {
		t.Fatalf("Get miss error: %v", err)
	}
	if hit {
		t.Errorf("Get before Set = hit, want miss")
	}

	if err := c.Set("d2", "A -> B", "<svg/>"); err != nil {
		t.Fatalf("Set error: %v", err)
	}

	got, hit, err = c.Get("d2", "A -> B")
	if err != nil {
		t.Fatalf("Get hit error: %v", err)
	}
	if !hit {
		t.Fatalf("Get after Set = miss, want hit")
	}
	if got != "<svg/>" {
		t.Errorf("Get = %q, want %q", got, "<svg/>")
	}
}

func TestCache_SourceChange_Invalidates(t *testing.T) {
	dir := t.TempDir()
	c := NewCache(dir, 1)
	_ = c.Init()

	_ = c.Set("d2", "A -> B", "<svg1/>")
	// Different code → different hash → miss.
	got, hit, _ := c.Get("d2", "A -> C")
	if hit {
		t.Errorf("different source should miss, got=%q", got)
	}
	// Original still present.
	got, hit, _ = c.Get("d2", "A -> B")
	if !hit || got != "<svg1/>" {
		t.Errorf("original source should still hit, got=%q hit=%v", got, hit)
	}
}

func TestCache_CacheVersion_Isolates(t *testing.T) {
	dir := t.TempDir()
	c1 := NewCache(dir, 1)
	_ = c1.Init()
	_ = c1.Set("d2", "A -> B", "<svg-v1/>")

	// Same work dir, version 2 → must miss v1's entry.
	c2 := NewCache(dir, 2)
	_ = c2.Init()
	got, hit, _ := c2.Get("d2", "A -> B")
	if hit {
		t.Errorf("version 2 should miss version 1 entry, got=%q", got)
	}

	// Writing under v2 must not affect v1.
	_ = c2.Set("d2", "A -> B", "<svg-v2/>")
	got, hit, _ = c1.Get("d2", "A -> B")
	if !hit || got != "<svg-v1/>" {
		t.Errorf("version 1 entry changed after v2 write: got=%q hit=%v", got, hit)
	}
}

func TestCache_EngineIsolation(t *testing.T) {
	dir := t.TempDir()
	c := NewCache(dir, 1)
	_ = c.Init()
	_ = c.Set("d2", "shared", "<d2/>")
	_ = c.Set("graphviz", "shared", "<graphviz/>")

	got, hit, _ := c.Get("d2", "shared")
	if !hit || got != "<d2/>" {
		t.Errorf("d2 entry wrong: got=%q hit=%v", got, hit)
	}
	got, hit, _ = c.Get("graphviz", "shared")
	if !hit || got != "<graphviz/>" {
		t.Errorf("graphviz entry wrong: got=%q hit=%v", got, hit)
	}
}

func TestCache_Set_ParentDirAutoCreated(t *testing.T) {
	dir := t.TempDir()
	c := NewCache(dir, 7) // version dir doesn't exist yet
	// Do NOT call Init first; Set should still create the tree.
	if err := c.Set("plantuml", "x", "<svg/>"); err != nil {
		t.Fatalf("Set without Init failed: %v", err)
	}
	got, hit, _ := c.Get("plantuml", "x")
	if !hit || got != "<svg/>" {
		t.Errorf("expected hit after Set, got=%q hit=%v", got, hit)
	}
}
