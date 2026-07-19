package docs

import "errors"

// Sentinel errors for document access. Callers (HTTP handlers, MCP tools) map
// these to the appropriate transport-level status/code while sharing one set
// of conditions.
var (
	// ErrInvalidPath is returned when the requested path is empty or malformed.
	ErrInvalidPath = errors.New("invalid path")
	// ErrAccessDenied is returned when the path escapes the docs root.
	ErrAccessDenied = errors.New("access denied")
	// ErrNotFound is returned when the document does not exist or is ignored.
	ErrNotFound = errors.New("not found")
)
