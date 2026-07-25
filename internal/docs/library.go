// Package docs provides read-only access to a markdown/html document library.
//
// It is the pure, transport-agnostic layer shared by the HTTP server
// (internal/server) and the MCP server (internal/mcp). All path resolution,
// directory scanning, file reading and full-text search lives here so neither
// transport duplicates the logic.
package docs

import (
	"bufio"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/wii/mdserve/internal/ignore"
	"github.com/wii/mdserve/internal/markdown"
	"github.com/wii/mdserve/internal/tag"
)

var htmlTagPattern = regexp.MustCompile(`<[^>]*>`)

// IsBrowsableDocument reports whether a file is rendered/browsable (currently
// markdown + html). Mirrors the server-side definition used by the file tree.
func IsBrowsableDocument(name string) bool {
	return IsSearchableDocument(name)
}

// DetectFileFormat returns "html" for .html/.htm files, "markdown" otherwise.
func DetectFileFormat(name string) string {
	lower := strings.ToLower(name)
	if strings.HasSuffix(lower, ".html") || strings.HasSuffix(lower, ".htm") {
		return "html"
	}
	return "markdown"
}

// IsSearchableDocument reports whether a file should be indexed for search.
func IsSearchableDocument(name string) bool {
	lower := strings.ToLower(name)
	return strings.HasSuffix(lower, ".md") ||
		strings.HasSuffix(lower, ".html") ||
		strings.HasSuffix(lower, ".htm")
}

// StripHTMLForSearch removes script/style blocks and all HTML tags, collapsing
// remaining whitespace, so HTML documents can be searched as plain text.
func StripHTMLForSearch(content string) string {
	content = stripTagBlock(content, "script")
	content = stripTagBlock(content, "style")
	content = htmlTagPattern.ReplaceAllString(content, " ")
	return strings.Join(strings.Fields(content), " ")
}

func stripTagBlock(content, tag string) string {
	open := regexp.MustCompile(`(?is)<` + tag + `[^>]*>`)
	close := regexp.MustCompile(`(?is)</` + tag + `\s*>`)
	for open.MatchString(content) {
		start := open.FindStringIndex(content)
		if start == nil {
			break
		}
		rest := content[start[1]:]
		end := close.FindStringIndex(rest)
		if end == nil {
			content = content[:start[0]]
			break
		}
		content = content[:start[0]] + rest[end[1]:]
	}
	return content
}

// FileInfo represents a file or directory in the browsable tree.
type FileInfo struct {
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Type     string     `json:"type"`
	Children []FileInfo `json:"children,omitempty"`
}

// SearchResult represents a single search hit.
type SearchResult struct {
	Path    string   `json:"path"`
	Name    string   `json:"name"`
	Matches []string `json:"matches"`
}

// ReadResult is the parsed content of a single document.
type ReadResult struct {
	Content      string                 `json:"content"`
	Format       string                 `json:"format"`
	ResolvedPath string                 `json:"resolvedPath"`
	Outline      []markdown.OutlineItem `json:"outline"`
	Tags         []string               `json:"tags,omitempty"`
	Categories   []string               `json:"categories,omitempty"`
}

// Library is a read-only view over a docs root directory. It is safe for
// concurrent use after construction; all methods are read-only.
type Library struct {
	rootPath      string
	ignoreMatcher *ignore.Matcher
	tagIndexer    *tag.Indexer
}

// New resolves and validates rootPath and returns a Library whose tag index has
// already been built. Returns an error if rootPath does not exist or is not a
// directory. Tag-index build failures are non-fatal (indexer returns empty).
func New(rootPath string, ignorePatterns []string) (*Library, error) {
	absPath, err := filepath.Abs(rootPath)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve path: %w", err)
	}
	info, err := os.Stat(absPath)
	if err != nil {
		return nil, fmt.Errorf("path does not exist: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("path is not a directory: %s", absPath)
	}

	lib := &Library{
		rootPath:      absPath,
		ignoreMatcher: ignore.New(ignorePatterns),
		tagIndexer:    tag.NewIndexer(absPath, ignorePatterns),
	}
	if err := lib.tagIndexer.Build(); err != nil {
		// Tag indexing is optional — match existing server behaviour: warn, continue.
		fmt.Printf("[WARN] Failed to build tag index: %v\n", err)
	}
	return lib, nil
}

// RootPath returns the absolute docs root.
func (l *Library) RootPath() string { return l.rootPath }

// IgnoreMatcher returns the ignore matcher (for callers that need it).
func (l *Library) IgnoreMatcher() *ignore.Matcher { return l.ignoreMatcher }

// TagIndexer returns the tag indexer.
func (l *Library) TagIndexer() *tag.Indexer { return l.tagIndexer }

// ResolvePath validates and normalises a user-supplied path (relative to the
// docs root) and optional base dir. It enforces path-traversal safety: a path
// that escapes the root via ".." is rejected (ok=false).
//
// rawBase, when provided and rawPath is not root-relative, is interpreted as
// the directory of the referencing document; the result is resolved relative
// to that directory (matching the existing /api/asset semantics).
func (l *Library) ResolvePath(rawPath, rawBase string) (relPath string, ok bool) {
	requested := strings.TrimSpace(strings.ReplaceAll(rawPath, "\\", "/"))
	if requested == "" {
		return "", false
	}

	isRootRelative := strings.HasPrefix(requested, "/")
	requested = strings.TrimLeft(requested, "/")
	requested = path.Clean(requested)
	if requested == "." || requested == ".." || strings.HasPrefix(requested, "../") {
		return "", false
	}

	resolved := requested
	if !isRootRelative && strings.TrimSpace(rawBase) != "" {
		base := strings.TrimSpace(strings.ReplaceAll(rawBase, "\\", "/"))
		base = strings.TrimLeft(base, "/")
		base = path.Clean(base)
		if base == ".." || strings.HasPrefix(base, "../") {
			return "", false
		}
		baseDir := path.Dir(base)
		if baseDir == "." {
			baseDir = ""
		}
		if baseDir != "" {
			resolved = path.Clean(baseDir + "/" + requested)
		}
	}

	if resolved == "." || resolved == ".." || strings.HasPrefix(resolved, "../") {
		return "", false
	}
	return resolved, true
}

// AbsolutePath joins relPath onto the root and verifies the result is still
// inside the root (path-traversal guard). ok is false if relPath escapes.
func (l *Library) AbsolutePath(relPath string) (absPath string, ok bool) {
	fullPath := filepath.Join(l.rootPath, filepath.FromSlash(relPath))
	rel, err := filepath.Rel(l.rootPath, fullPath)
	if err != nil {
		return "", false
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return "", false
	}
	return fullPath, true
}

// ListTree returns the recursive browsable-document tree under the root,
// honouring ignore patterns and hidden-file rules. Directories with no
// browsable children are omitted.
func (l *Library) ListTree() ([]FileInfo, error) {
	return l.scanDirectory(l.rootPath, l.rootPath, 0)
}

// ListTreeAt returns the browsable tree under relPath with a depth limit.
// Empty relPath means the docs root. depth 0 means unlimited (full subtree);
// depth 1 returns only direct children (directory nodes omit nested children).
func (l *Library) ListTreeAt(relPath string, depth int) ([]FileInfo, error) {
	relPath = normalizeTreePath(relPath)
	dir := l.rootPath
	if relPath != "" {
		cleaned := path.Clean(relPath)
		if cleaned == "." || cleaned == ".." || strings.HasPrefix(cleaned, "../") {
			return nil, ErrInvalidPath
		}
		relPath = cleaned
		abs, ok := l.AbsolutePath(relPath)
		if !ok {
			return nil, ErrAccessDenied
		}
		info, err := os.Stat(abs)
		if err != nil || !info.IsDir() {
			return nil, ErrNotFound
		}
		if l.ignoreMatcher.ShouldIgnoreDir(relPath) {
			return nil, ErrNotFound
		}
		dir = abs
	}
	if depth < 0 {
		depth = 0
	}
	return l.scanDirectory(dir, l.rootPath, depth)
}

// scanDirectory scans dir. depth 0 = unlimited; depth 1 = direct children only.
func (l *Library) scanDirectory(dir, root string, depth int) ([]FileInfo, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		// Skip hidden files (mirrors existing behaviour).
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		fullPath := filepath.Join(dir, entry.Name())
		relPath, _ := filepath.Rel(root, fullPath)

		if entry.IsDir() {
			if l.ignoreMatcher.ShouldIgnoreDir(relPath) {
				continue
			}
			if depth == 1 {
				if !l.hasBrowsableContent(fullPath, root) {
					continue
				}
				files = append(files, FileInfo{
					Name: entry.Name(),
					Path: relPath,
					Type: "directory",
				})
				continue
			}
			nextDepth := 0
			if depth > 1 {
				nextDepth = depth - 1
			}
			children, err := l.scanDirectory(fullPath, root, nextDepth)
			if err != nil {
				continue
			}
			if len(children) > 0 {
				files = append(files, FileInfo{
					Name:     entry.Name(),
					Path:     relPath,
					Type:     "directory",
					Children: children,
				})
			}
		} else if IsBrowsableDocument(entry.Name()) {
			if l.ignoreMatcher.ShouldIgnoreFile(relPath) {
				continue
			}
			files = append(files, FileInfo{
				Name: entry.Name(),
				Path: relPath,
				Type: "file",
			})
		}
	}

	return files, nil
}

// hasBrowsableContent reports whether dir contains any browsable document
// (used when depth=1 to omit empty directories without returning their children).
func (l *Library) hasBrowsableContent(dir, root string) bool {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		fullPath := filepath.Join(dir, entry.Name())
		relPath, _ := filepath.Rel(root, fullPath)
		if entry.IsDir() {
			if l.ignoreMatcher.ShouldIgnoreDir(relPath) {
				continue
			}
			if l.hasBrowsableContent(fullPath, root) {
				return true
			}
		} else if IsBrowsableDocument(entry.Name()) {
			if !l.ignoreMatcher.ShouldIgnoreFile(relPath) {
				return true
			}
		}
	}
	return false
}

// ReadDoc reads and parses a single document. If relPath points at a directory,
// it resolves to README.md (preferred) then index.html/index.htm, matching the
// existing /api/file fallback order.
//
// Returns an error wrapping a sentinel via errors.Is where appropriate is not
// needed yet; callers branch on the textual category. Path-traversal and
// ignored files yield a "not found" error to avoid leaking existence.
func (l *Library) ReadDoc(rawPath string) (*ReadResult, error) {
	relPath, ok := l.ResolvePath(rawPath, "")
	if !ok {
		return nil, ErrInvalidPath
	}

	fullPath, ok := l.AbsolutePath(relPath)
	if !ok {
		return nil, ErrAccessDenied
	}

	if l.ignoreMatcher.ShouldIgnoreFile(relPath) {
		return nil, ErrNotFound
	}

	info, err := os.Stat(fullPath)
	if err == nil && info.IsDir() {
		entries, readErr := os.ReadDir(fullPath)
		if readErr != nil {
			return nil, ErrNotFound
		}
		found := false
		for _, entry := range entries {
			if !entry.IsDir() && strings.EqualFold(entry.Name(), "readme.md") {
				relPath = path.Join(relPath, entry.Name())
				fullPath = filepath.Join(fullPath, entry.Name())
				found = true
				break
			}
		}
		if !found {
			for _, entry := range entries {
				if entry.IsDir() {
					continue
				}
				lower := strings.ToLower(entry.Name())
				if lower == "index.html" || lower == "index.htm" {
					relPath = path.Join(relPath, entry.Name())
					fullPath = filepath.Join(fullPath, entry.Name())
					found = true
					break
				}
			}
		}
		if !found {
			return nil, ErrNotFound
		}
	}

	content, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, ErrNotFound
	}

	contentStr := string(content)
	format := DetectFileFormat(filepath.Base(relPath))

	result := &ReadResult{
		Content:      contentStr,
		Format:       format,
		ResolvedPath: relPath,
	}

	if format == "html" {
		result.Outline = []markdown.OutlineItem{}
		return result, nil
	}

	frontMatter, cleanContent := markdown.ExtractFrontMatter(contentStr)
	result.Content = cleanContent
	result.Outline = markdown.ExtractOutline(cleanContent)
	if frontMatter != nil {
		result.Tags = frontMatter.Tags
		result.Categories = frontMatter.Categories
	}
	return result, nil
}

// Search performs a case-insensitive full-text search over all browsable
// documents, returning at most 50 results. Matches come from filenames,
// heading text (markdown only) and line content (HTML stripped first).
func (l *Library) Search(query string) ([]SearchResult, error) {
	if strings.TrimSpace(query) == "" {
		return []SearchResult{}, nil
	}
	query = strings.ToLower(query)
	var results []SearchResult

	err := filepath.Walk(l.rootPath, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		relPath, _ := filepath.Rel(l.rootPath, p)

		if info.IsDir() {
			if l.ignoreMatcher.ShouldIgnoreDir(relPath) {
				return filepath.SkipDir
			}
			return nil
		}
		if l.ignoreMatcher.ShouldIgnoreFile(relPath) {
			return nil
		}
		if strings.HasPrefix(info.Name(), ".") {
			return nil
		}
		if !IsSearchableDocument(info.Name()) {
			return nil
		}

		content, err := os.ReadFile(p)
		if err != nil {
			return nil
		}

		contentStr := string(content)
		isHTML := DetectFileFormat(info.Name()) == "html"
		if isHTML {
			contentStr = StripHTMLForSearch(contentStr)
		}

		var matches []string

		if strings.Contains(strings.ToLower(info.Name()), query) {
			matches = append(matches, "文件名匹配")
		}

		scanner := bufio.NewScanner(strings.NewReader(contentStr))
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(strings.ToLower(line), query) {
				context := extractContext(line, query)
				if len(matches) < 5 {
					matches = append(matches, context)
				}
			}
		}

		if !isHTML {
			headings := markdown.ExtractOutline(contentStr)
			for _, h := range headings {
				if strings.Contains(strings.ToLower(h.Text), query) {
					matches = append(matches, "标题: "+h.Text)
				}
			}
		}

		if len(matches) > 0 {
			results = append(results, SearchResult{
				Path:    relPath,
				Name:    info.Name(),
				Matches: matches,
			})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if len(results) > 50 {
		results = results[:50]
	}
	return results, nil
}

// extractContext extracts a context window around the match (mirrors the
// existing /api/search behaviour).
func extractContext(line, query string) string {
	line = strings.TrimSpace(line)
	if len(line) > 100 {
		idx := strings.Index(strings.ToLower(line), strings.ToLower(query))
		if idx == -1 {
			return line[:97] + "..."
		}
		start := idx - 30
		if start < 0 {
			start = 0
		}
		end := idx + len(query) + 30
		if end > len(line) {
			end = len(line)
		}
		context := line[start:end]
		if start > 0 {
			context = "..." + context
		}
		if end < len(line) {
			context = context + "..."
		}
		return context
	}
	return line
}
