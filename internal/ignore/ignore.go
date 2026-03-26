package ignore

import (
	"path/filepath"
	"strings"
)

// Matcher handles ignore pattern matching
type Matcher struct {
	patterns []string
}

// New creates a new ignore matcher with the given patterns
func New(patterns []string) *Matcher {
	// Clean and normalize patterns
	cleaned := make([]string, 0, len(patterns))
	for _, p := range patterns {
		p = strings.TrimSpace(p)
		if p != "" && !strings.HasPrefix(p, "#") {
			// Normalize path separators
			p = filepath.ToSlash(p)
			cleaned = append(cleaned, p)
		}
	}
	return &Matcher{patterns: cleaned}
}

// Match checks if the given path should be ignored
// The path should be relative to the root directory
func (m *Matcher) Match(path string) bool {
	if len(m.patterns) == 0 {
		return false
	}

	// Normalize path
	path = filepath.ToSlash(path)
	path = strings.TrimPrefix(path, "./")

	for _, pattern := range m.patterns {
		if matchPattern(pattern, path) {
			return true
		}
	}
	return false
}

// matchPattern checks if a single pattern matches the path
func matchPattern(pattern, path string) bool {
	// Handle different pattern types
	pattern = strings.TrimPrefix(pattern, "./")

	// **/ prefix means match in any directory
	if strings.HasPrefix(pattern, "**/") {
		suffix := pattern[3:]
		// Check if path ends with the suffix or contains it as a segment
		if strings.HasSuffix(path, suffix) {
			return true
		}
		// Check if any directory in path contains the suffix
		return containsGlobMatch(path, suffix)
	}

	// /** suffix means match everything under a directory
	if strings.HasSuffix(pattern, "/**") {
		prefix := pattern[:len(pattern)-3]
		// Check if path starts with the prefix (as a directory)
		if strings.HasPrefix(path, prefix+"/") || path == prefix {
			return true
		}
		return false
	}

	// ** in the middle
	if strings.Contains(pattern, "/**/") {
		parts := strings.SplitN(pattern, "/**/", 2)
		prefix := parts[0]
		suffix := parts[1]
		// Path should start with prefix and end with suffix (or contain suffix as segment)
		if prefix == "" || strings.HasPrefix(path, prefix+"/") {
			if suffix == "" {
				return true
			}
			rest := path
			if prefix != "" {
				rest = strings.TrimPrefix(path, prefix+"/")
			}
			if rest == suffix || strings.HasPrefix(rest, suffix+"/") || strings.HasSuffix(rest, "/"+suffix) || strings.Contains(rest, "/"+suffix+"/") {
				return true
			}
		}
		return false
	}

	// Simple glob pattern (no **)
	// Check exact match or with wildcards
	matched, _ := filepath.Match(pattern, path)
	if matched {
		return true
	}

	// Also check if the pattern matches any component of the path
	// For example, pattern "*.tmp" should match "foo/bar.tmp"
	if !strings.Contains(pattern, "/") {
		// Pattern without directory separator - check each path component
		parts := strings.Split(path, "/")
		for _, part := range parts {
			matched, _ = filepath.Match(pattern, part)
			if matched {
				return true
			}
		}
	}

	return false
}

// containsGlobMatch checks if the path contains a segment matching the suffix pattern
func containsGlobMatch(path, suffix string) bool {
	parts := strings.Split(path, "/")
	for i := range parts {
		// Build subpath from current position
		subpath := strings.Join(parts[i:], "/")
		matched, _ := filepath.Match(suffix, subpath)
		if matched {
			return true
		}
		// Also check just the current segment for simple patterns
		if !strings.Contains(suffix, "/") {
			matched, _ = filepath.Match(suffix, parts[i])
			if matched {
				return true
			}
		}
	}
	return false
}

// ShouldIgnoreDir checks if a directory should be ignored during traversal
// This is more aggressive - if a pattern like "foo/**" matches, the whole dir is ignored
func (m *Matcher) ShouldIgnoreDir(dirPath string) bool {
	if len(m.patterns) == 0 {
		return false
	}

	dirPath = filepath.ToSlash(dirPath)
	dirPath = strings.TrimPrefix(dirPath, "./")

	for _, pattern := range m.patterns {
		pattern = strings.TrimPrefix(pattern, "./")

		// Pattern ending with /** means ignore entire directory tree
		if strings.HasSuffix(pattern, "/**") {
			prefix := pattern[:len(pattern)-3]
			if dirPath == prefix || strings.HasPrefix(dirPath, prefix+"/") {
				return true
			}
		}

		// Pattern starting with **/ and no more path segments
		if strings.HasPrefix(pattern, "**/") {
			suffix := pattern[3:]
			// If suffix has no /, it's a simple name pattern
			if !strings.Contains(suffix, "/") {
				matched, _ := filepath.Match(suffix, filepath.Base(dirPath))
				if matched {
					return true
				}
			}
		}

		// Exact directory match or with wildcards
		matched, _ := filepath.Match(pattern, dirPath)
		if matched {
			return true
		}

		// Pattern without slashes - check directory name
		if !strings.Contains(pattern, "/") {
			matched, _ := filepath.Match(pattern, filepath.Base(dirPath))
			if matched {
				return true
			}
		}
	}

	return false
}

// ShouldIgnoreFile checks if a file should be ignored
func (m *Matcher) ShouldIgnoreFile(filePath string) bool {
	return m.Match(filePath)
}

// Patterns returns the list of patterns
func (m *Matcher) Patterns() []string {
	return m.patterns
}
