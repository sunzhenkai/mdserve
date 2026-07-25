package docs

import (
	"fmt"
	"strings"
	"sync"
)

// TreeCache holds an in-memory browsable file tree that matches ListTree()
// semantics. It is safe for concurrent use.
type TreeCache struct {
	lib *Library

	mu    sync.RWMutex
	tree  []FileInfo
	ready bool
	err   error

	rebuildMu sync.Mutex
}

// NewTreeCache creates a cache bound to lib. Call Rebuild to populate it.
func NewTreeCache(lib *Library) *TreeCache {
	return &TreeCache{lib: lib}
}

// Ready reports whether a successful build has completed.
func (c *TreeCache) Ready() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.ready && c.err == nil
}

// Get returns a copy of the cached tree. If the cache is not ready it rebuilds
// synchronously. On build failure it falls back to a live ListTree() scan.
func (c *TreeCache) Get() ([]FileInfo, error) {
	c.mu.RLock()
	if c.ready {
		tree, err := c.tree, c.err
		c.mu.RUnlock()
		if err != nil {
			return c.lib.ListTree()
		}
		return cloneFileInfos(tree), nil
	}
	c.mu.RUnlock()

	if err := c.Rebuild(); err != nil {
		return c.lib.ListTree()
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.err != nil {
		return c.lib.ListTree()
	}
	return cloneFileInfos(c.tree), nil
}

// Rebuild rescans the docs root and replaces the cached tree. Concurrent
// Rebuild calls are serialized; callers may use debounce externally.
func (c *TreeCache) Rebuild() error {
	c.rebuildMu.Lock()
	defer c.rebuildMu.Unlock()

	tree, err := c.lib.ListTree()

	c.mu.Lock()
	defer c.mu.Unlock()
	c.ready = true
	if err != nil {
		c.err = err
		fmt.Printf("[WARN] Failed to rebuild file tree cache: %v\n", err)
		return err
	}
	c.tree = tree
	c.err = nil
	return nil
}

// Slice returns the cached subtree at path with the given depth. ok is false
// when the cache is not ready (caller should fall back to a live scan).
// depth 0 means unlimited; depth 1 returns only direct children.
func (c *TreeCache) Slice(path string, depth int) (files []FileInfo, err error, ok bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if !c.ready || c.err != nil {
		return nil, nil, false
	}
	files, err = SliceTree(c.tree, path, depth)
	return files, err, true
}

func cloneFileInfos(in []FileInfo) []FileInfo {
	if in == nil {
		return nil
	}
	out := make([]FileInfo, len(in))
	for i, f := range in {
		out[i] = FileInfo{
			Name:     f.Name,
			Path:     f.Path,
			Type:     f.Type,
			Children: cloneFileInfos(f.Children),
		}
	}
	return out
}

// SliceTree returns nodes under path limited by depth.
// path empty means the tree root. depth 0 means unlimited depth.
// depth 1 returns only direct children (directory nodes have no nested children).
func SliceTree(tree []FileInfo, path string, depth int) ([]FileInfo, error) {
	path = normalizeTreePath(path)
	nodes := tree
	if path != "" {
		node := findTreeNode(tree, path)
		if node == nil || node.Type != "directory" {
			return nil, ErrNotFound
		}
		nodes = node.Children
		if nodes == nil {
			nodes = []FileInfo{}
		}
	}
	if depth == 0 {
		return cloneFileInfos(nodes), nil
	}
	return cloneFileInfosDepth(nodes, depth), nil
}

func normalizeTreePath(path string) string {
	path = strings.TrimSpace(strings.ReplaceAll(path, "\\", "/"))
	path = strings.Trim(path, "/")
	if path == "." {
		return ""
	}
	return path
}

func findTreeNode(tree []FileInfo, path string) *FileInfo {
	for i := range tree {
		if tree[i].Path == path {
			return &tree[i]
		}
		if tree[i].Type == "directory" && len(tree[i].Children) > 0 {
			if node := findTreeNode(tree[i].Children, path); node != nil {
				return node
			}
		}
	}
	return nil
}

func cloneFileInfosDepth(in []FileInfo, depth int) []FileInfo {
	if in == nil {
		return nil
	}
	out := make([]FileInfo, len(in))
	for i, f := range in {
		out[i] = FileInfo{
			Name: f.Name,
			Path: f.Path,
			Type: f.Type,
		}
		if f.Type == "directory" && depth > 1 {
			out[i].Children = cloneFileInfosDepth(f.Children, depth-1)
		}
		// depth == 1: omit Children (unexpanded)
	}
	return out
}
