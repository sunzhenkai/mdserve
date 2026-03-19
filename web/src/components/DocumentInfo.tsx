import { FileText, Tag, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentInfoProps {
  path: string | null
  tags: string[]
  categories: string[]
  onTagClick?: (tag: string) => void
  onCategoryClick?: (category: string) => void
}

export function DocumentInfo({ path, tags, categories, onTagClick, onCategoryClick }: DocumentInfoProps) {
  if (!path && tags.length === 0 && categories.length === 0) {
    return null
  }

  return (
    <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {/* 文档路径 */}
        {path && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{path}</span>
          </div>
        )}

        {/* 分类 */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryClick?.(category)}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary",
                    "hover:bg-primary/20 transition-colors cursor-pointer"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagClick?.(tag)}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground",
                    "hover:bg-secondary/80 transition-colors cursor-pointer"
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
