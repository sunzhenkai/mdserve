package docs

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTreeCache_GetRebuild(t *testing.T) {
	lib, root := newLib(t)
	if err := os.WriteFile(filepath.Join(root, "a.md"), []byte("# a"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	cache := NewTreeCache(lib)
	if cache.Ready() {
		t.Fatal("expected cache not ready before Rebuild")
	}

	if err := cache.Rebuild(); err != nil {
		t.Fatalf("Rebuild: %v", err)
	}
	if !cache.Ready() {
		t.Fatal("expected cache ready after Rebuild")
	}

	first, err := cache.Get()
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if len(first) != 1 || first[0].Name != "a.md" {
		t.Fatalf("unexpected tree: %+v", first)
	}

	second, err := cache.Get()
	if err != nil {
		t.Fatalf("second Get: %v", err)
	}
	if len(second) != 1 || second[0].Name != "a.md" {
		t.Fatalf("unexpected second tree: %+v", second)
	}

	// Mutation of returned slice must not affect cache.
	second[0].Name = "mutated"
	third, err := cache.Get()
	if err != nil {
		t.Fatalf("third Get: %v", err)
	}
	if third[0].Name != "a.md" {
		t.Fatalf("cache was mutated: %+v", third)
	}
}

func TestTreeCache_SliceDepth1(t *testing.T) {
	lib, root := newLib(t)
	if err := os.MkdirAll(filepath.Join(root, "guide", "nested"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "root.md"), []byte("# r"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "guide", "intro.md"), []byte("# i"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "guide", "nested", "deep.md"), []byte("# d"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	cache := NewTreeCache(lib)
	if err := cache.Rebuild(); err != nil {
		t.Fatalf("Rebuild: %v", err)
	}

	rootFiles, err, ok := cache.Slice("", 1)
	if !ok || err != nil {
		t.Fatalf("Slice root: ok=%v err=%v", ok, err)
	}
	if len(rootFiles) != 2 {
		t.Fatalf("root depth=1 len=%d, want 2: %+v", len(rootFiles), rootFiles)
	}
	for _, f := range rootFiles {
		if f.Type == "directory" && len(f.Children) != 0 {
			t.Fatalf("directory %q should omit children at depth=1", f.Path)
		}
	}

	guideFiles, err, ok := cache.Slice("guide", 1)
	if !ok || err != nil {
		t.Fatalf("Slice guide: ok=%v err=%v", ok, err)
	}
	if len(guideFiles) != 2 {
		t.Fatalf("guide depth=1 len=%d, want 2: %+v", len(guideFiles), guideFiles)
	}
	for _, f := range guideFiles {
		if f.Type == "directory" && len(f.Children) != 0 {
			t.Fatalf("directory %q should omit children at depth=1", f.Path)
		}
	}

	_, err, ok = cache.Slice("missing", 1)
	if !ok {
		t.Fatal("expected cache ready")
	}
	if err != ErrNotFound {
		t.Fatalf("missing path err=%v, want ErrNotFound", err)
	}
}

func TestListTreeAt_Depth1(t *testing.T) {
	lib, root := newLib(t)
	if err := os.MkdirAll(filepath.Join(root, "guide", "nested"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "root.md"), []byte("# r"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "guide", "intro.md"), []byte("# i"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "guide", "nested", "deep.md"), []byte("# d"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "empty"), 0o755); err != nil {
		t.Fatalf("mkdir empty: %v", err)
	}

	rootFiles, err := lib.ListTreeAt("", 1)
	if err != nil {
		t.Fatalf("ListTreeAt root: %v", err)
	}
	names := map[string]string{}
	for _, f := range rootFiles {
		names[f.Name] = f.Type
		if f.Type == "directory" && len(f.Children) != 0 {
			t.Fatalf("directory children should be omitted: %+v", f)
		}
	}
	if names["root.md"] != "file" || names["guide"] != "directory" {
		t.Fatalf("unexpected root listing: %+v", rootFiles)
	}
	if _, ok := names["empty"]; ok {
		t.Fatal("empty directory should be omitted")
	}

	guideFiles, err := lib.ListTreeAt("guide", 1)
	if err != nil {
		t.Fatalf("ListTreeAt guide: %v", err)
	}
	if len(guideFiles) != 2 {
		t.Fatalf("guide listing: %+v", guideFiles)
	}

	if _, err := lib.ListTreeAt("../etc", 1); err != ErrInvalidPath && err != ErrAccessDenied {
		t.Fatalf("traversal err=%v", err)
	}
	if _, err := lib.ListTreeAt("nope", 1); err != ErrNotFound {
		t.Fatalf("missing dir err=%v, want ErrNotFound", err)
	}
}
