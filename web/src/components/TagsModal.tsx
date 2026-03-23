import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Tag, Folder, FileText, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModalShell } from '@/components/common/ModalShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

interface TagsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allTags: Record<string, string[]>        // { tag: [doc1, doc2] }
  allCategories: Record<string, string[]>  // { category: [doc1, doc2] }
  currentTags: string[]                    // 当前文档的标签
  currentCategories: string[]              // 当前文档的分类
  onFileSelect: (path: string) => void     // 点击文档跳转
  initialTab?: TabType                     // 初始 tab
  initialSelected?: string                 // 初始选中项
}

type TabType = 'tags' | 'categories'

export function TagsModal({ 
  open, 
  onOpenChange, 
  allTags, 
  allCategories, 
  currentTags, 
  currentCategories,
  onFileSelect,
  initialTab,
  initialSelected
}: TagsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'categories')
  const [selectedItem, setSelectedItem] = useState<string | null>(initialSelected || null)

  // 当 initialTab 或 initialSelected 变化时更新状态
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab || 'categories')
      setSelectedItem(initialSelected || null)
    }
  }, [open, initialTab, initialSelected])

  const tagsList = Object.entries(allTags).sort(([a], [b]) => a.localeCompare(b))
  const categoriesList = Object.entries(allCategories).sort(([a], [b]) => a.localeCompare(b))
  
  const selectedDocs = selectedItem 
    ? (activeTab === 'tags' ? allTags[selectedItem] : allCategories[selectedItem]) || []
    : []

  const activeItemsList = activeTab === 'tags' ? tagsList : categoriesList
  const activeCurrentItems = activeTab === 'tags' ? currentTags : currentCategories
  const emptyText = activeTab === 'tags' ? '暂无标签' : '暂无分类'

  const handleItemClick = (item: string) => {
    setSelectedItem(selectedItem === item ? null : item)
  }

  const handleFileClick = (path: string) => {
    onFileSelect(path)
    onOpenChange(false)
  }

  const handleTabChange = (value: TabType) => {
    setActiveTab(value)
    setSelectedItem(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalShell className="max-h-[80vh]" hideClose>
        <Tabs
          value={activeTab}
          onValueChange={(value) => handleTabChange(value as TabType)}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* modal header：标题 + 分类/标签切换 同一行 */}
          <div className="flex items-center gap-3 px-4 py-3 bg-background flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h2 className="text-base font-semibold leading-none truncate">分类和标签</h2>
            </div>

            <div className="flex-1 flex justify-end min-w-0">
              <TabsList className="w-fit flex items-center gap-1 bg-transparent h-auto p-0 rounded-none border-0 text-muted-foreground">
                <TabsTrigger
                  value="categories"
                  className={cn(
                    'flex items-center justify-start gap-1 text-xs px-2 py-1 rounded-md border transition-colors',
                    'bg-transparent text-muted-foreground border-transparent hover:bg-muted/60',
                    'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-sm'
                  )}
                >
                  <Folder className="h-4 w-4" />
                  分类
                </TabsTrigger>

                <TabsTrigger
                  value="tags"
                  className={cn(
                    'flex items-center justify-start gap-1 text-xs px-2 py-1 rounded-md border transition-colors',
                    'bg-transparent text-muted-foreground border-transparent hover:bg-muted/60',
                    'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-sm'
                  )}
                >
                  <Tag className="h-4 w-4" />
                  标签
                </TabsTrigger>
              </TabsList>
            </div>

            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 hover:bg-accent rounded-md transition-colors flex-shrink-0"
              title="关闭"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <Separator className="bg-border flex-shrink-0" />

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {activeItemsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{emptyText}</div>
            ) : selectedItem ? (
              <SelectedDocsPanel
                selectedItem={selectedItem}
                currentItems={activeCurrentItems}
                selectedDocs={selectedDocs}
                onItemClick={handleItemClick}
                onFileClick={handleFileClick}
              />
            ) : (
              <ItemListPanel
                items={activeItemsList}
                currentItems={activeCurrentItems}
                selectedItem={selectedItem}
                onItemClick={handleItemClick}
              />
            )}
          </div>
        </Tabs>
      </ModalShell>
    </Dialog>
  )
}

// 列表面板：标签/分类列表（未选中时展示）
interface ItemListPanelProps {
  items: [string, string[]][]
  currentItems: string[]
  selectedItem: string | null
  onItemClick: (item: string) => void
}

function ItemListPanel({
  items,
  currentItems,
  selectedItem,
  onItemClick,
}: ItemListPanelProps) {
  return (
    <div className="py-2">
      <div className="flex flex-wrap gap-2">
        {items.map(([item, docs]) => {
          const isCurrent = currentItems.includes(item)
          const isSelected = selectedItem === item

          return (
            <Badge
              key={item}
              variant={isSelected ? 'default' : isCurrent ? 'secondary' : 'outline'}
              className="cursor-pointer"
            >
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full bg-transparent border-0 p-0',
                  'focus:outline-none'
                )}
              >
                {isCurrent && <Star className="h-3.5 w-3.5 fill-current" />}
                <span className="leading-none">{item}</span>
                <span
                  className={cn(
                    'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                    isSelected
                      ? 'border-primary/30 bg-background/60 text-primary-foreground'
                      : 'border-border bg-background/60 text-muted-foreground'
                  )}
                >
                  {docs.length}
                </span>
              </button>
            </Badge>
          )
        })}
      </div>
    </div>
  )
}

// 选中面板：隐藏标签/分类列表，仅展示选中项与关联文档
interface SelectedDocsPanelProps {
  selectedItem: string
  currentItems: string[]
  selectedDocs: string[]
  onItemClick: (item: string) => void
  onFileClick: (path: string) => void
}

function SelectedDocsPanel({
  selectedItem,
  currentItems,
  selectedDocs,
  onItemClick,
  onFileClick,
}: SelectedDocsPanelProps) {
  const isCurrent = currentItems.includes(selectedItem)

  return (
    <div className="pt-2">
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <Badge variant="default" className="cursor-pointer">
          <button
            type="button"
            onClick={() => onItemClick(selectedItem)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-transparent border-0 p-0',
              'focus:outline-none'
            )}
          >
            {isCurrent && <Star className="h-3.5 w-3.5 fill-current" />}
            <span className="leading-none">{selectedItem}</span>
            <span className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none border-primary/30 bg-background/60 text-primary-foreground">
              {selectedDocs.length}
            </span>
          </button>
        </Badge>
      </div>

      <Separator className="bg-border/50" />

      <div className="pt-3">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pb-2">
          <h4 className="px-1 text-sm font-medium text-muted-foreground mb-1">
            &quot;{selectedItem}&quot; 的关联文档 ({selectedDocs.length})
          </h4>
        </div>

        <div className="space-y-1 pr-2 pb-3">
          {selectedDocs.map((doc) => {
            const fileName = doc.split('/').pop() || doc
            return (
              <Button
                key={doc}
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-2 h-auto py-2 px-2 rounded-md text-sm font-normal',
                  'hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => onFileClick(doc)}
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="truncate">{fileName}</div>
                  {doc !== fileName && (
                    <div className="text-xs text-muted-foreground truncate">
                      {doc}
                    </div>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
