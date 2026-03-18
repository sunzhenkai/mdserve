package markdown

import (
	"regexp"
	"strings"
)

// OutlineItem represents a heading in the document
type OutlineItem struct {
	Level int    `json:"level"`
	Text  string `json:"text"`
	Slug  string `json:"slug"`
}

var (
	slugRegex       = regexp.MustCompile(`[^a-zA-Z0-9\p{Han}]+`)
	headingRegex    = regexp.MustCompile(`^(#{1,6})\s+(.+)$`)
	whitespaceRegex = regexp.MustCompile(`\s+`)
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

	// Handle duplicate slugs
	if c, exists := count[slug]; exists {
		count[slug] = c + 1
		slug = slug + "-" + strings.Repeat("a", c)
	} else {
		count[slug] = 1
	}

	return slug
}
