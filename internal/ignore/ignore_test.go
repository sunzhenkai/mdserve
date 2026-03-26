package ignore

import (
	"testing"
)

func TestMatcher_Match(t *testing.T) {
	tests := []struct {
		name     string
		patterns []string
		path     string
		want     bool
	}{
		// Basic patterns
		{
			name:     "empty patterns",
			patterns: []string{},
			path:     "foo/bar.md",
			want:     false,
		},
		{
			name:     "exact match",
			patterns: []string{"draft/readme.md"},
			path:     "draft/readme.md",
			want:     true,
		},
		{
			name:     "exact match - different path",
			patterns: []string{"draft/readme.md"},
			path:     "public/readme.md",
			want:     false,
		},
		// Wildcard patterns
		{
			name:     "wildcard extension",
			patterns: []string{"*.tmp"},
			path:     "foo/bar.tmp",
			want:     true,
		},
		{
			name:     "wildcard extension - no match",
			patterns: []string{"*.tmp"},
			path:     "foo/bar.md",
			want:     false,
		},
		{
			name:     "wildcard in directory",
			patterns: []string{"draft/*"},
			path:     "draft/readme.md",
			want:     true,
		},
		{
			name:     "wildcard in directory - subdirectory",
			patterns: []string{"draft/*"},
			path:     "draft/sub/readme.md",
			want:     false, // * doesn't match across directories
		},
		// Double star patterns
		{
			name:     "double star prefix",
			patterns: []string{"**/test/**"},
			path:     "foo/test/bar.md",
			want:     true,
		},
		{
			name:     "double star prefix - root level",
			patterns: []string{"**/test/**"},
			path:     "test/bar.md",
			want:     true,
		},
		{
			name:     "double star prefix - no match",
			patterns: []string{"**/test/**"},
			path:     "foo/bar.md",
			want:     false,
		},
		{
			name:     "double star suffix",
			patterns: []string{"draft/**"},
			path:     "draft/foo/bar.md",
			want:     true,
		},
		{
			name:     "double star suffix - exact dir",
			patterns: []string{"draft/**"},
			path:     "draft",
			want:     true,
		},
		{
			name:     "double star suffix - no match",
			patterns: []string{"draft/**"},
			path:     "public/foo.md",
			want:     false,
		},
		{
			name:     "double star middle",
			patterns: []string{"docs/**/api.md"},
			path:     "docs/v1/guide/api.md",
			want:     true,
		},
		// Underscore prefix
		{
			name:     "underscore prefix",
			patterns: []string{"_*"},
			path:     "_draft/readme.md",
			want:     true,
		},
		{
			name:     "underscore prefix file",
			patterns: []string{"_*"},
			path:     "docs/_sidebar.md",
			want:     true,
		},
		// Multiple patterns
		{
			name:     "multiple patterns - first matches",
			patterns: []string{"draft/**", "temp/**"},
			path:     "draft/readme.md",
			want:     true,
		},
		{
			name:     "multiple patterns - second matches",
			patterns: []string{"draft/**", "temp/**"},
			path:     "temp/readme.md",
			want:     true,
		},
		{
			name:     "multiple patterns - none match",
			patterns: []string{"draft/**", "temp/**"},
			path:     "public/readme.md",
			want:     false,
		},
		// Complex patterns
		{
			name:     "complex pattern with extension",
			patterns: []string{"**/*.tmp.md"},
			path:     "docs/draft/notes.tmp.md",
			want:     true,
		},
		{
			name:     "pattern with question mark",
			patterns: []string{"test?.md"},
			path:     "test1.md",
			want:     true,
		},
		// Edge cases
		{
			name:     "path with ./ prefix",
			patterns: []string{"draft/**"},
			path:     "./draft/readme.md",
			want:     true,
		},
		{
			name:     "pattern with ./ prefix",
			patterns: []string{"./draft/**"},
			path:     "draft/readme.md",
			want:     true,
		},
		{
			name:     "comment pattern ignored",
			patterns: []string{"# this is a comment", "draft/**"},
			path:     "draft/readme.md",
			want:     true,
		},
		{
			name:     "empty pattern ignored",
			patterns: []string{"", "draft/**"},
			path:     "draft/readme.md",
			want:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := New(tt.patterns)
			if got := m.Match(tt.path); got != tt.want {
				t.Errorf("Match(%q) = %v, want %v", tt.path, got, tt.want)
			}
		})
	}
}

func TestMatcher_ShouldIgnoreDir(t *testing.T) {
	tests := []struct {
		name     string
		patterns []string
		dirPath  string
		want     bool
	}{
		{
			name:     "double star suffix - ignore tree",
			patterns: []string{"draft/**"},
			dirPath:  "draft",
			want:     true,
		},
		{
			name:     "double star suffix - subdirectory",
			patterns: []string{"draft/**"},
			dirPath:  "draft/subdir",
			want:     true,
		},
		{
			name:     "double star suffix - different dir",
			patterns: []string{"draft/**"},
			dirPath:  "public",
			want:     false,
		},
		{
			name:     "underscore prefix",
			patterns: []string{"_*"},
			dirPath:  "_draft",
			want:     true,
		},
		{
			name:     "simple pattern match dir name",
			patterns: []string{"node_modules"},
			dirPath:  "node_modules",
			want:     true,
		},
		{
			name:     "simple pattern no match",
			patterns: []string{"node_modules"},
			dirPath:  "src",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := New(tt.patterns)
			if got := m.ShouldIgnoreDir(tt.dirPath); got != tt.want {
				t.Errorf("ShouldIgnoreDir(%q) = %v, want %v", tt.dirPath, got, tt.want)
			}
		})
	}
}

func TestMatcher_ShouldIgnoreFile(t *testing.T) {
	tests := []struct {
		name     string
		patterns []string
		filePath string
		want     bool
	}{
		{
			name:     "ignore tmp files",
			patterns: []string{"*.tmp.md"},
			filePath: "docs/notes.tmp.md",
			want:     true,
		},
		{
			name:     "ignore in draft directory",
			patterns: []string{"draft/**"},
			filePath: "draft/readme.md",
			want:     true,
		},
		{
			name:     "don't ignore regular files",
			patterns: []string{"draft/**"},
			filePath: "public/readme.md",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := New(tt.patterns)
			if got := m.ShouldIgnoreFile(tt.filePath); got != tt.want {
				t.Errorf("ShouldIgnoreFile(%q) = %v, want %v", tt.filePath, got, tt.want)
			}
		})
	}
}
