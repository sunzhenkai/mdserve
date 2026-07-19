package mcp

import "strings"

// normalizeSlashes converts backslashes to forward slashes and trims leading
// separators and whitespace.
func normalizeSlashes(p string) string {
	p = strings.TrimSpace(p)
	p = strings.ReplaceAll(p, "\\", "/")
	p = strings.TrimLeft(p, "/")
	return p
}

// splitSegments splits a slash path into non-empty, non-"." segments.
func splitSegments(p string) []string {
	var out []string
	for _, seg := range strings.Split(p, "/") {
		seg = strings.TrimSpace(seg)
		if seg == "" || seg == "." {
			continue
		}
		out = append(out, seg)
	}
	return out
}
