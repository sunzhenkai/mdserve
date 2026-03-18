package markdown

import (
	"reflect"
	"testing"
)

func TestExtractFrontMatter(t *testing.T) {
	tests := []struct {
		name             string
		content          string
		wantFrontMatter  *FrontMatter
		wantCleanContent string
	}{
		{
			name: "inline tags and categories",
			content: `---
tags: [JavaScript, React, TypeScript]
categories: [前端开发, 教程]
---

# Title`,
			wantFrontMatter: &FrontMatter{
				Tags:       []string{"JavaScript", "React", "TypeScript"},
				Categories: []string{"前端开发", "教程"},
			},
			wantCleanContent: "# Title",
		},
		{
			name: "multi-line tags",
			content: `---
tags:
  - tag1
  - tag2
---

# Title`,
			wantFrontMatter: &FrontMatter{
				Tags: []string{"tag1", "tag2"},
			},
			wantCleanContent: "# Title",
		},
		{
			name: "no frontmatter",
			content: `# Title

Some content`,
			wantFrontMatter:  nil,
			wantCleanContent: "# Title\n\nSome content",
		},
		{
			name: "empty frontmatter",
			content: `---
---

# Title`,
			wantFrontMatter:  nil,
			wantCleanContent: "# Title",
		},
		{
			name: "only tags",
			content: `---
tags: [tag1, tag2]
---

# Title`,
			wantFrontMatter: &FrontMatter{
				Tags: []string{"tag1", "tag2"},
			},
			wantCleanContent: "# Title",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotFrontMatter, gotCleanContent := ExtractFrontMatter(tt.content)

			if !reflect.DeepEqual(gotFrontMatter, tt.wantFrontMatter) {
				t.Errorf("ExtractFrontMatter() frontMatter = %v, want %v", gotFrontMatter, tt.wantFrontMatter)
			}

			if gotCleanContent != tt.wantCleanContent {
				t.Errorf("ExtractFrontMatter() cleanContent = %q, want %q", gotCleanContent, tt.wantCleanContent)
			}
		})
	}
}
