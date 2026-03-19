package markdown

import (
	"fmt"
	"regexp"
	"strings"
)

// OutlineItem represents a heading in the document
type OutlineItem struct {
	Level int    `json:"level"`
	Text  string `json:"text"`
	Slug  string `json:"slug"`
}

// FrontMatter represents metadata in the document header
type FrontMatter struct {
	Tags       []string `json:"tags,omitempty"`
	Categories []string `json:"categories,omitempty"`
}

var (
	slugRegex        = regexp.MustCompile(`[^a-zA-Z0-9\p{Han}]+`)
	headingRegex     = regexp.MustCompile(`^(#{1,6})\s+(.+)$`)
	whitespaceRegex  = regexp.MustCompile(`\s+`)
	frontMatterRegex = regexp.MustCompile(`^---\s*\n([\s\S]*?)\n?---\s*\n?`)
)

// ExtractOutline extracts headings from markdown content
func ExtractOutline(content string) []OutlineItem {
	var outline []OutlineItem
	headingCount := make(map[string]int)

	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		matches := headingRegex.FindStringSubmatch(line)
		if matches != nil {
			level := len(matches[1])
			text := strings.TrimSpace(matches[2])

			if text == "" {
				continue
			}

			// Generate slug
			slug := generateSlug(text, headingCount)

			outline = append(outline, OutlineItem{
				Level: level,
				Text:  text,
				Slug:  slug,
			})
		}
	}

	return outline
}

func generateSlug(text string, count map[string]int) string {
	// Convert to lowercase and replace non-alphanumeric with hyphens
	slug := strings.ToLower(text)
	slug = slugRegex.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")

	// Handle duplicate slugs (match rehype-slug behavior)
	// rehype-slug uses: slug, slug-1, slug-2, ...
	if c, exists := count[slug]; exists {
		count[slug] = c + 1
		slug = fmt.Sprintf("%s-%d", slug, c)
	} else {
		count[slug] = 1
	}

	return slug
}

// ExtractFrontMatter extracts frontmatter metadata from markdown content
// Returns the frontmatter and the content with frontmatter removed
func ExtractFrontMatter(content string) (*FrontMatter, string) {
	matches := frontMatterRegex.FindStringSubmatch(content)
	if matches == nil {
		return nil, content
	}

	frontMatterText := matches[1]
	remainingContent := strings.TrimPrefix(content, matches[0])

	fm := &FrontMatter{}

	// Parse tags
	if tags := parseYamlList(frontMatterText, "tags"); len(tags) > 0 {
		fm.Tags = tags
	}

	// Parse categories
	if categories := parseYamlList(frontMatterText, "categories"); len(categories) > 0 {
		fm.Categories = categories
	}

	// If no tags or categories found, return nil
	if len(fm.Tags) == 0 && len(fm.Categories) == 0 {
		return nil, remainingContent
	}

	return fm, remainingContent
}

// parseYamlList parses a YAML-style list from frontmatter text
// Supports both inline format (tags: [tag1, tag2]) and multi-line format
func parseYamlList(text, key string) []string {
	var result []string
	lines := strings.Split(text, "\n")

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])

		// Check for inline format: key: [value1, value2]
		if strings.HasPrefix(line, key+":") {
			value := strings.TrimSpace(strings.TrimPrefix(line, key+":"))

			// Check if it's inline array format
			if strings.HasPrefix(value, "[") && strings.HasSuffix(value, "]") {
				// Parse inline array
				value = strings.Trim(value, "[]")
				items := strings.Split(value, ",")
				for _, item := range items {
					item = strings.TrimSpace(item)
					item = strings.Trim(item, `'"`)
					if item != "" {
						result = append(result, item)
					}
				}
				return result
			}

			// Check if it's a simple string value
			value = strings.Trim(value, `'"`)
			if value != "" && !strings.HasPrefix(value, "-") {
				return []string{value}
			}

			// Multi-line format: continue reading list items
			for j := i + 1; j < len(lines); j++ {
				nextLine := strings.TrimSpace(lines[j])
				if strings.HasPrefix(nextLine, "- ") {
					item := strings.TrimSpace(strings.TrimPrefix(nextLine, "-"))
					item = strings.Trim(item, `'"`)
					if item != "" {
						result = append(result, item)
					}
				} else if nextLine != "" && !strings.HasPrefix(nextLine, "-") {
					// End of list
					break
				}
			}
			return result
		}
	}

	return result
}
