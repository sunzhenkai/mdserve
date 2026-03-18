import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tag, Folder } from 'lucide-react'

interface TagsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags?: string[]
  categories?: string[]
}

export function TagsModal({ open, onOpenChange, tags, categories }: TagsModalProps) {
  const hasTags = tags && tags.length > 0
  const hasCategories = categories && categories.length > 0
  const hasAnyMetadata = hasTags || hasCategories

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>标签和分类</DialogTitle>
        </DialogHeader>
        
        {!hasAnyMetadata ? (
          <div className="text-center py-8 text-muted-foreground">
            当前文件没有标签或分类
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tags Section */}
            {hasTags && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">标签</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Section */}
            {hasCategories && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">分类</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground border border-border"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
