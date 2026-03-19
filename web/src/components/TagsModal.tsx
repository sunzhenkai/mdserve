import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tag, Folder, FileText, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModalShell } from '@/components/common/ModalShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'tags')
  const [selectedItem, setSelectedItem] = useState<string | null>(initialSelected || null)

  // 当 initialTab 或 initialSelected 变化时更新状态
  useEffect(() => {
    if (open) {
      if (initialTab) {
        setActiveTab(initialTab)
      }
      if (initialSelected) {
        setSelectedItem(initialSelected)
      }
    }
  }, [open, initialTab, initialSelected])

  const tagsList = Object.entries(allTags).sort(([a], [b]) => a.localeCompare(b))
  const categoriesList = Object.entries(allCategories).sort(([a], [b]) => a.localeCompare(b))
  
  const selectedDocs = selectedItem 
    ? (activeTab === 'tags' ? allTags[selectedItem] : allCategories[selectedItem]) || []
    : []

  const handleItemClick = (item: string) => {
    setSelectedItem(selectedItem === item ? null : item)
  }

  const handleFileClick = (path: string) => {
    onFileSelect(path)
    onOpenChange(false)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabType)
    setSelectedItem(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalShell className="max-h-[80vh]" hideClose>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col min-h-0"
        >
          {/* modal header: 标题 + 分类/标签切换 */}
          <div className="flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold leading-none">标签和分类</h2>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 hover:bg-accent rounded-md transition-colors flex-shrink-0"
                title="关闭"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <TabsList className="grid w-full grid-cols-2 px-4 gap-1 bg-transparent">
              <TabsTrigger value="categories" className="flex items-center gap-1 text-xs px-2 py-1">
                <Folder className="h-4 w-4" />
                分类 ({categoriesList.length})
              </TabsTrigger>
              <TabsTrigger value="tags" className="flex items-center gap-1 text-xs px-2 py-1">
                <Tag className="h-4 w-4" />
                标签 ({tagsList.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tags" className="flex-1 min-h-0 overflow-y-auto px-4 mt-0">
            {tagsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无标签
              </div>
            ) : (
              <div className="flex flex-col min-h-0 w-full">
                <ItemPanel
                  items={tagsList}
                  currentItems={currentTags}
                  selectedItem={selectedItem}
                  selectedDocs={selectedDocs}
                  onItemClick={handleItemClick}
                  onFileClick={handleFileClick}
                  type="tags"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="categories"
            className="flex-1 min-h-0 overflow-y-auto px-4 mt-0"
          >
            {categoriesList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无分类
              </div>
            ) : (
              <div className="flex flex-col min-h-0 w-full">
                <ItemPanel
                  items={categoriesList}
                  currentItems={currentCategories}
                  selectedItem={selectedItem}
                  selectedDocs={selectedDocs}
                  onItemClick={handleItemClick}
                  onFileClick={handleFileClick}
                  type="categories"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ModalShell>
    </Dialog>
  )
}

// 抽取的列表面板组件
interface ItemPanelProps {
  items: [string, string[]][]
  currentItems: string[]
  selectedItem: string | null
  selectedDocs: string[]
  onItemClick: (item: string) => void
  onFileClick: (path: string) => void
  type: 'tags' | 'categories'
}

function ItemPanel({ 
  items, 
  currentItems, 
  selectedItem, 
  selectedDocs, 
  onItemClick, 
  onFileClick 
}: ItemPanelProps) {
  return (
    <div className="flex flex-col min-h-0 w-full">
      {/* 上：标签/分类列表 */}
      <div className="flex-shrink-0 min-h-[140px] max-h-[240px] overflow-y-auto pr-2">
        <div className="flex flex-wrap gap-2 py-2">
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
                    "inline-flex items-center gap-1.5 rounded-full bg-transparent border-0 p-0",
                    "focus:outline-none"
                  )}
                >
                  {isCurrent && <Star className="h-3.5 w-3.5 fill-current" />}
                  <span className="leading-none">{item}</span>
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                      isSelected
                        ? "border-primary/30 bg-background/60 text-primary-foreground"
                        : "border-border bg-background/60 text-muted-foreground"
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

      {/* 下：关联文档列表 */}
      <div className="border-t border-border/50 pt-3">
        {selectedItem ? (
          <div>
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pb-2">
              <h4 className="px-1 text-sm font-medium text-muted-foreground mb-2">
                "{selectedItem}" 的关联文档 ({selectedDocs.length})
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
                      "w-full justify-start gap-2 h-auto py-2 px-2 rounded-md text-sm font-normal",
                      "hover:bg-accent hover:text-accent-foreground"
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
        ) : (
          <div className="min-h-[120px] flex items-center justify-center px-2 text-xs text-muted-foreground pb-3">
            请选择标签/分类查看关联文档
          </div>
        )}
      </div>
    </div>
  )
}
