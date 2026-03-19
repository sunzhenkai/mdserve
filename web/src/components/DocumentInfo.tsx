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
    <section className="mb-5 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
      <div className="space-y-3 text-sm">
        {/* 文档路径 */}
        {path && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-md bg-muted p-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">路径</p>
              <p className="mt-0.5 truncate font-mono text-xs text-foreground/90">{path}</p>
            </div>
          </div>
        )}

        {/* 分类 */}
        {categories.length > 0 && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-md bg-muted p-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">分类</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryClick?.(category)}
                  className={cn(
                    "rounded-md border border-primary/25 bg-primary/8 px-2 py-1 text-xs font-medium text-primary",
                    "hover:bg-primary/15 hover:border-primary/35 transition-colors cursor-pointer"
                  )}
                >
                  {category}
                </button>
              ))}
              </div>
            </div>
          </div>
        )}

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-md bg-muted p-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">标签</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagClick?.(tag)}
                  className={cn(
                    "rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground",
                    "hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  )}
                >
                  #{tag}
                </button>
              ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
