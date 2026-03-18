package tag

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

// Indexer manages tag indexing for markdown files
type Indexer struct {
	rootPath string
	tagMap   map[string][]string // tag -> list of document paths
	mu       sync.RWMutex
}

// NewIndexer creates a new tag indexer
func NewIndexer(rootPath string) *Indexer {
	return &Indexer{
		rootPath: rootPath,
		tagMap:   make(map[string][]string),
	}
}

// Build scans all markdown files and builds the tag index
func (i *Indexer) Build() error {
	i.mu.Lock()
	defer i.mu.Unlock()

	// Clear existing index
	i.tagMap = make(map[string][]string)

	return filepath.Walk(i.rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files that can't be accessed
		}

		if info.IsDir() {
			return nil
		}

		// Only process markdown files
		if !strings.HasSuffix(strings.ToLower(path), ".md") {
			return nil
		}

		// Extract tags from the file
		tags := i.extractTags(path)

		// Get relative path
		relPath, err := filepath.Rel(i.rootPath, path)
		if err != nil {
			return nil
		}

		// Add to tag map
		for _, tag := range tags {
			tag = strings.TrimSpace(tag)
			if tag == "" {
				continue
			}
			i.tagMap[tag] = append(i.tagMap[tag], relPath)
		}

		return nil
	})
}

// GetTags returns all tags with their associated documents
func (i *Indexer) GetTags() map[string][]string {
	i.mu.RLock()
	defer i.mu.RUnlock()

	// Return a copy to prevent race conditions
	result := make(map[string][]string)
	for tag, docs := range i.tagMap {
		result[tag] = append([]string{}, docs...)
	}
	return result
}

// GetTagDocs returns documents associated with a specific tag
func (i *Indexer) GetTagDocs(tag string) []string {
	i.mu.RLock()
	defer i.mu.RUnlock()

	docs, exists := i.tagMap[tag]
	if !exists {
		return []string{}
	}
	return append([]string{}, docs...)
}

// extractTags extracts tags from the YAML front matter of a markdown file
func (i *Indexer) extractTags(path string) []string {
	content, err := os.ReadFile(path)
	if err != nil {
		return []string{}
	}

	return ExtractTagsFromContent(content)
}

// frontMatterRegex matches YAML front matter
var frontMatterRegex = regexp.MustCompile(`(?s)^---\s*\n(.*?)\n---\s*\n`)

// tagsRegex matches tags in various YAML formats
var tagsRegex = regexp.MustCompile(`(?m)^\s*tags\s*:\s*(?:\[([^\]]*)\]|(.*))$`)

// ExtractTagsFromContent extracts tags from markdown content with YAML front matter
func ExtractTagsFromContent(content []byte) []string {
	// Find front matter
	matches := frontMatterRegex.FindSubmatch(content)
	if len(matches) < 2 {
		return []string{}
	}

	frontMatter := matches[1]
	return ParseTagsFromYAML(frontMatter)
}

// ParseTagsFromYAML parses tags from YAML front matter content
func ParseTagsFromYAML(frontMatter []byte) []string {
	var tags []string

	// Find the tags line
	tagMatches := tagsRegex.FindAllSubmatch(frontMatter, -1)
	for _, match := range tagMatches {
		if len(match) >= 2 {
			// match[1] is for array format [tag1, tag2]
			// match[2] is for list format (continuation lines)
			if len(match[1]) > 0 {
				// Array format: tags: [tag1, tag2, tag3]
				tagsStr := string(match[1])
				parts := strings.Split(tagsStr, ",")
				for _, p := range parts {
					p = strings.TrimSpace(p)
					p = strings.Trim(p, `'"`)
					if p != "" {
						tags = append(tags, p)
					}
				}
			} else if len(match[2]) > 0 {
				// Inline format: tags: tag1 tag2
				// or first item of list format
				tagsStr := strings.TrimSpace(string(match[2]))
				if tagsStr != "" && !strings.HasPrefix(tagsStr, "-") {
					// Inline format
					parts := strings.Fields(tagsStr)
					for _, p := range parts {
						p = strings.Trim(p, `'"`)
						if p != "" {
							tags = append(tags, p)
						}
					}
				}
			}
		}
	}

	// Also check for list format (- tag1, - tag2)
	// This is a simplified parser for common YAML tag formats
	lines := bytes.Split(frontMatter, []byte("\n"))
	inTags := false
	for _, line := range lines {
		lineStr := strings.TrimSpace(string(line))

		if strings.HasPrefix(lineStr, "tags:") {
			inTags = true
			// Check if tags are on the same line
			rest := strings.TrimSpace(strings.TrimPrefix(lineStr, "tags:"))
			if rest != "" && !strings.HasPrefix(rest, "-") && !strings.HasPrefix(rest, "[") {
				// Inline format
				parts := strings.Fields(rest)
				for _, p := range parts {
					p = strings.Trim(p, `'"`)
					if p != "" {
						tags = append(tags, p)
					}
				}
				inTags = false
			}
			continue
		}

		if inTags {
			if strings.HasPrefix(lineStr, "- ") {
				tag := strings.TrimSpace(strings.TrimPrefix(lineStr, "-"))
				tag = strings.Trim(tag, `'"`)
				if tag != "" {
					tags = append(tags, tag)
				}
			} else if lineStr != "" && !strings.HasPrefix(lineStr, "#") {
				// End of tags list
				inTags = false
			}
		}
	}

	return tags
}
