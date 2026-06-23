package diagram

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

// Cache stores rendered SVG diagrams on disk keyed by content hash.
//
// Path layout:
//
//	<root>/.mdserve/cache/diagrams/<cache_version>/<engine>/<sha256(code)>.svg
//
// The key depends only on cache_version + engine + code, so source edits and
// cache_version bumps naturally invalidate prior entries. There is no TTL or
// size cap (intentional, per design D4).
type Cache struct {
	root         string // absolute path to cache root (.../diagrams)
	cacheVersion int
}

// NewCache builds a Cache rooted at <workDir>/.mdserve/cache/diagrams.
func NewCache(workDir string, cacheVersion int) *Cache {
	if cacheVersion <= 0 {
		cacheVersion = 1
	}
	return &Cache{
		root:         filepath.Join(workDir, ".mdserve", "cache", "diagrams"),
		cacheVersion: cacheVersion,
	}
}

// Init creates the cache directory tree and verifies it is writable. Returns
// a descriptive error if the work directory cannot be used for caching.
func (c *Cache) Init() error {
	if err := os.MkdirAll(c.root, 0755); err != nil {
		return fmt.Errorf("create cache dir %s: %w", c.root, err)
	}
	// Verify writability with a probe file rather than relying on permission bits
	// (covers read-only mounts, full disks, etc.).
	probe := filepath.Join(c.root, ".mdserve-probe")
	if err := os.WriteFile(probe, []byte("ok"), 0644); err != nil {
		return fmt.Errorf("cache dir %s is not writable: %w", c.root, err)
	}
	_ = os.Remove(probe)
	return nil
}

// pathFor returns the absolute file path for a cached entry.
func (c *Cache) pathFor(engine, code string) string {
	sum := sha256.Sum256([]byte(code))
	hash := hex.EncodeToString(sum[:])
	return filepath.Join(c.root, strconv.Itoa(c.cacheVersion), engine, hash+".svg")
}

// Get reads a cached SVG. Returns ("", false, nil) on a miss.
func (c *Cache) Get(engine, code string) (string, bool, error) {
	path := c.pathFor(engine, code)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", false, nil
		}
		return "", false, fmt.Errorf("read cache %s: %w", path, err)
	}
	return string(data), true, nil
}

// Set writes an SVG to the cache, creating parent directories as needed.
func (c *Cache) Set(engine, code, svg string) error {
	path := c.pathFor(engine, code)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("create cache subdir for %s: %w", path, err)
	}
	if err := os.WriteFile(path, []byte(svg), 0644); err != nil {
		return fmt.Errorf("write cache %s: %w", path, err)
	}
	return nil
}

// Root returns the absolute cache root path (useful for logging/tests).
func (c *Cache) Root() string { return c.root }
