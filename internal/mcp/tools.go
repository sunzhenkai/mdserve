package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/wii/mdserve/internal/docs"
)

// tool is an internal MCP tool definition: metadata + handler.
type tool struct {
	def     Tool
	handler func(ctx context.Context, args map[string]any) (string, error)
}

// buildTools returns the read-only tool set backed by the given library.
// Tools are pure functions over the docs.Library; they never mutate state.
func buildTools(lib *docs.Library) []tool {
	return []tool{
		{
			def: Tool{
				Name:        "list_docs",
				Description: "List the browsable document tree (markdown + HTML files) under the docs root, honouring ignore patterns. Returns a nested JSON tree of files and directories.",
				InputSchema: schema(
					"The document directory to list, relative to the docs root (e.g. \"guide\"). Omit to list the whole tree.",
					map[string]any{"path": map[string]any{"type": "string", "description": "Optional sub-directory path relative to docs root."}},
					[]string{},
				),
			},
			handler: func(_ context.Context, args map[string]any) (string, error) {
				tree, err := lib.ListTree()
				if err != nil {
					return "", err
				}
				// Optional sub-path filter (purely cosmetic: the library only
				// scans the root; we slice the returned tree client-side).
				if sub, _ := args["path"].(string); sub != "" {
					tree = filterTreeByPath(tree, sub)
				}
				b, err := json.MarshalIndent(tree, "", "  ")
				if err != nil {
					return "", err
				}
				if len(tree) == 0 {
					return "No documents found.", nil
				}
				return string(b), nil
			},
		},
		{
			def: Tool{
				Name:        "read_doc",
				Description: "Read a single markdown or HTML document by its path relative to the docs root. Returns the raw document content (front matter stripped for markdown). For directories, resolves README.md first, then index.html.",
				InputSchema: schema(
					"The path of the document to read.",
					map[string]any{"path": map[string]any{"type": "string", "description": "Document path relative to docs root (e.g. \"guide/getting-started.md\")."}},
					[]string{"path"},
				),
			},
			handler: func(_ context.Context, args map[string]any) (string, error) {
				p, _ := args["path"].(string)
				if p == "" {
					return "", errMissingArg("path")
				}
				res, err := lib.ReadDoc(p)
				if err != nil {
					return "", err
				}
				out := struct {
					Path       string   `json:"path"`
					Format     string   `json:"format"`
					Tags       []string `json:"tags,omitempty"`
					Categories []string `json:"categories,omitempty"`
					Content    string   `json:"content"`
				}{
					Path:       res.ResolvedPath,
					Format:     res.Format,
					Tags:       res.Tags,
					Categories: res.Categories,
					Content:    res.Content,
				}
				b, err := json.MarshalIndent(out, "", "  ")
				if err != nil {
					return "", err
				}
				return string(b), nil
			},
		},
		{
			def: Tool{
				Name:        "search_docs",
				Description: "Full-text search across all browsable documents. Matches file names, headings (markdown), and line content (HTML stripped first). Returns up to 50 results with context snippets.",
				InputSchema: schema(
					"The search query.",
					map[string]any{"query": map[string]any{"type": "string", "description": "Case-insensitive search query."}},
					[]string{"query"},
				),
			},
			handler: func(_ context.Context, args map[string]any) (string, error) {
				q, _ := args["query"].(string)
				if q == "" {
					return "", errMissingArg("query")
				}
				results, err := lib.Search(q)
				if err != nil {
					return "", err
				}
				if len(results) == 0 {
					return fmt.Sprintf("No documents matched %q.", q), nil
				}
				b, err := json.MarshalIndent(results, "", "  ")
				if err != nil {
					return "", err
				}
				return string(b), nil
			},
		},
		{
			def: Tool{
				Name:        "get_outline",
				Description: "Get the heading outline (table of contents) of a markdown document. Returns an empty list for HTML documents.",
				InputSchema: schema(
					"The markdown document path.",
					map[string]any{"path": map[string]any{"type": "string", "description": "Document path relative to docs root."}},
					[]string{"path"},
				),
			},
			handler: func(_ context.Context, args map[string]any) (string, error) {
				p, _ := args["path"].(string)
				if p == "" {
					return "", errMissingArg("path")
				}
				res, err := lib.ReadDoc(p)
				if err != nil {
					return "", err
				}
				b, err := json.MarshalIndent(res.Outline, "", "  ")
				if err != nil {
					return "", err
				}
				return string(b), nil
			},
		},
		{
			def: Tool{
				Name:        "list_tags",
				Description: "List all tags and categories extracted from document front matter, each mapped to the documents that carry them.",
				InputSchema: schema("No parameters.", map[string]any{}, []string{}),
			},
			handler: func(_ context.Context, _ map[string]any) (string, error) {
				indexer := lib.TagIndexer()
				out := struct {
					Tags       map[string][]string `json:"tags"`
					Categories map[string][]string `json:"categories"`
				}{
					Tags:       indexer.GetTags(),
					Categories: indexer.GetCategories(),
				}
				b, err := json.MarshalIndent(out, "", "  ")
				if err != nil {
					return "", err
				}
				return string(b), nil
			},
		},
	}
}

// schema builds a JSON Schema object for an object-typed tool input.
func schema(description string, properties map[string]any, required []string) map[string]any {
	m := map[string]any{
		"type":        "object",
		"description": description,
		"properties":  properties,
	}
	if len(required) > 0 {
		m["required"] = required
	}
	if len(properties) == 0 {
		// An empty-properties object should still allow {} — additionalProperties
		// defaults to true in JSON Schema, so leave it.
		m["properties"] = map[string]any{}
	}
	return m
}

// toolError wraps a user-facing message with a JSON-RPC error code.
type toolError struct {
	code    int
	message string
}

func (e *toolError) Error() string { return e.message }

func errMissingArg(name string) error {
	return &toolError{code: CodeInvalidParams, message: fmt.Sprintf("missing required argument: %s", name)}
}

// filterTreeByPath returns the sub-tree rooted at the given relative path,
// matching segment-by-segment against directory names. Returns empty if not
// found. Used only by the optional list_docs "path" argument.
func filterTreeByPath(tree []docs.FileInfo, relPath string) []docs.FileInfo {
	relPath = normalizeSlashes(relPath)
	if relPath == "" || relPath == "." {
		return tree
	}
	segs := splitSegments(relPath)
	current := tree
	for _, seg := range segs {
		var found []docs.FileInfo
		for _, f := range current {
			if f.Type == "directory" && f.Name == seg {
				found = f.Children
				break
			}
		}
		if found == nil {
			return nil
		}
		current = found
	}
	return current
}

// asToolError extracts a *toolError from err, or nil.
func asToolError(err error) *toolError {
	var te *toolError
	if errors.As(err, &te) {
		return te
	}
	return nil
}
