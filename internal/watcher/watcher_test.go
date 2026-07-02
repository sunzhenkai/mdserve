package watcher

import "testing"

func TestIsDocumentFile(t *testing.T) {
	tests := []struct {
		name string
		want bool
	}{
		{"README.md", true},
		{"page.HTML", true},
		{"index.htm", true},
		{"image.png", false},
		{"notes.txt", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isDocumentFile(tt.name); got != tt.want {
				t.Fatalf("isDocumentFile(%q) = %v, want %v", tt.name, got, tt.want)
			}
		})
	}
}
