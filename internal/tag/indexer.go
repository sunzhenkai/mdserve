package tag

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"github.com/wii/mdserve/internal/ignore"
)

// Indexer manages tag and category indexing for markdown files
type Indexer struct {
	rootPath      string
	tagMap        map[string][]string // tag -> list of document paths
	categoryMap   map[string][]string // category -> list of document paths
	ignoreMatcher *ignore.Matcher
	mu            sync.RWMutex
}

// NewIndexer creates a new tag indexer
func NewIndexer(rootPath string, ignorePatterns []string) *Indexer {
	return &Indexer{
		rootPath:      rootPath,
		tagMap:        make(map[string][]string),
		categoryMap:   make(map[string][]string),
		ignoreMatcher: ignore.New(ignorePatterns),
	}
}

// Build scans all markdown files and builds the tag and category index
func (i *Indexer) Build() error {
	i.mu.Lock()
	defer i.mu.Unlock()

	// Clear existing index
	i.tagMap = make(map[string][]string)
	i.categoryMap = make(map[string][]string)

	return filepath.Walk(i.rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files that can't be accessed
		}

		// Get relative path for ignore checking
		relPath, err := filepath.Rel(i.rootPath, path)
		if err != nil {
			return nil
		}

		// Skip ignored directories and files
		if info.IsDir() {
			if i.ignoreMatcher.ShouldIgnoreDir(relPath) {
				return filepath.SkipDir
			}
			return nil
		}

		// Only process markdown files
		if !strings.HasSuffix(strings.ToLower(path), ".md") {
			return nil
		}

		// Skip ignored files
		if i.ignoreMatcher.ShouldIgnoreFile(relPath) {
			return nil
		}

		// Extract tags and categories from the file
		tags, categories := i.extractMetadata(path)

		// Add to tag map
		for _, tag := range tags {
			tag = strings.TrimSpace(tag)
			if tag == "" {
				continue
			}
			i.tagMap[tag] = append(i.tagMap[tag], relPath)
		}

		// Add to category map
		for _, category := range categories {
			category = strings.TrimSpace(category)
			if category == "" {
				continue
			}
			i.categoryMap[category] = append(i.categoryMap[category], relPath)
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

// GetCategories returns all categories with their associated documents
func (i *Indexer) GetCategories() map[string][]string {
	i.mu.RLock()
	defer i.mu.RUnlock()

	// Return a copy to prevent race conditions
	result := make(map[string][]string)
	for category, docs := range i.categoryMap {
		result[category] = append([]string{}, docs...)
	}
	return result
}

// GetCategoryDocs returns documents associated with a specific category
func (i *Indexer) GetCategoryDocs(category string) []string {
	i.mu.RLock()
	defer i.mu.RUnlock()

	docs, exists := i.categoryMap[category]
	if !exists {
		return []string{}
	}
	return append([]string{}, docs...)
}

// extractMetadata extracts tags and categories from the YAML front matter of a markdown file
func (i *Indexer) extractMetadata(path string) ([]string, []string) {
	content, err := os.ReadFile(path)
	if err != nil {
		return []string{}, []string{}
	}

	return ExtractMetadataFromContent(content)
}

// frontMatterRegex matches YAML front matter
var frontMatterRegex = regexp.MustCompile(`(?s)^---\s*\n(.*?)\n---\s*\n`)

// tagsRegex matches tags in various YAML formats
var tagsRegex = regexp.MustCompile(`(?m)^\s*tags\s*:\s*(?:\[([^\]]*)\]|(.*))$`)

// categoriesRegex matches categories in various YAML formats
var categoriesRegex = regexp.MustCompile(`(?m)^\s*categor(?:y|ies)\s*:\s*(?:\[([^\]]*)\]|(.*))$`)

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

// ExtractMetadataFromContent extracts both tags and categories from markdown content with YAML front matter
func ExtractMetadataFromContent(content []byte) ([]string, []string) {
	// Find front matter
	matches := frontMatterRegex.FindSubmatch(content)
	if len(matches) < 2 {
		return []string{}, []string{}
	}

	frontMatter := matches[1]
	tags := ParseTagsFromYAML(frontMatter)
	categories := ParseCategoriesFromYAML(frontMatter)
	return tags, categories
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

// ParseCategoriesFromYAML parses categories from YAML front matter content
func ParseCategoriesFromYAML(frontMatter []byte) []string {
	var categories []string

	// Find the categories line
	categoryMatches := categoriesRegex.FindAllSubmatch(frontMatter, -1)
	for _, match := range categoryMatches {
		if len(match) >= 2 {
			// match[1] is for array format [cat1, cat2]
			// match[2] is for list format (continuation lines)
			if len(match[1]) > 0 {
				// Array format: categories: [cat1, cat2, cat3]
				categoriesStr := string(match[1])
				parts := strings.Split(categoriesStr, ",")
				for _, p := range parts {
					p = strings.TrimSpace(p)
					p = strings.Trim(p, `'"`)
					if p != "" {
						categories = append(categories, p)
					}
				}
			} else if len(match[2]) > 0 {
				// Inline format: categories: cat1 cat2
				// or first item of list format
				categoriesStr := strings.TrimSpace(string(match[2]))
				if categoriesStr != "" && !strings.HasPrefix(categoriesStr, "-") {
					// Inline format
					parts := strings.Fields(categoriesStr)
					for _, p := range parts {
						p = strings.Trim(p, `'"`)
						if p != "" {
							categories = append(categories, p)
						}
					}
				}
			}
		}
	}

	// Also check for list format (- cat1, - cat2)
	lines := bytes.Split(frontMatter, []byte("\n"))
	inCategories := false
	for _, line := range lines {
		lineStr := strings.TrimSpace(string(line))

		if strings.HasPrefix(lineStr, "categories:") || strings.HasPrefix(lineStr, "category:") {
			inCategories = true
			// Check if categories are on the same line
			var rest string
			if strings.HasPrefix(lineStr, "categories:") {
				rest = strings.TrimSpace(strings.TrimPrefix(lineStr, "categories:"))
			} else {
				rest = strings.TrimSpace(strings.TrimPrefix(lineStr, "category:"))
			}
			if rest != "" && !strings.HasPrefix(rest, "-") && !strings.HasPrefix(rest, "[") {
				// Inline format
				parts := strings.Fields(rest)
				for _, p := range parts {
					p = strings.Trim(p, `'"`)
					if p != "" {
						categories = append(categories, p)
					}
				}
				inCategories = false
			}
			continue
		}

		if inCategories {
			if strings.HasPrefix(lineStr, "- ") {
				category := strings.TrimSpace(strings.TrimPrefix(lineStr, "-"))
				category = strings.Trim(category, `'"`)
				if category != "" {
					categories = append(categories, category)
				}
			} else if lineStr != "" && !strings.HasPrefix(lineStr, "#") {
				// End of categories list
				inCategories = false
			}
		}
	}

	return categories
}
