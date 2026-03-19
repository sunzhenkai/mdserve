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
  const hasAny = Boolean(path) || tags.length > 0 || categories.length > 0
  if (!hasAny) {
    return null
  }

  return (
    // meta 信息：强制单行，避免路径/分类/标签在布局里“竖排多行”
    <div className="flex items-center gap-3 min-w-0 whitespace-nowrap text-sm w-full">
      {/* 路径 */}
      {path && (
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <div className="rounded-md bg-muted p-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="min-w-0 truncate font-mono text-xs text-foreground/90">{path}</span>
        </div>
      )}

      {/* 分类 */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <div className="rounded-md bg-muted p-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryClick?.(category)}
                className={cn(
                  'rounded-md border border-primary/25 bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary',
                  'hover:bg-primary/15 hover:border-primary/35 transition-colors cursor-pointer',
                  'truncate max-w-[120px]'
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
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <div className="rounded-md bg-muted p-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className={cn(
                  'rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground',
                  'hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer',
                  'truncate max-w-[120px]'
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
