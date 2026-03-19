import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tag, Folder, FileText, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>标签和分类</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              标签 ({tagsList.length})
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              分类 ({categoriesList.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tags" className="flex-1 overflow-hidden mt-4">
            {tagsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无标签
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden gap-4 h-full">
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
          
          <TabsContent value="categories" className="flex-1 overflow-hidden mt-4">
            {categoriesList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无分类
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden gap-4 h-full">
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
        
        {/* 图例说明 */}
        {(tagsList.length > 0 || categoriesList.length > 0) && (
          <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span>当前文档的{activeTab === 'tags' ? '标签' : '分类'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs opacity-70">(n)</span>
              <span>关联文档数量</span>
            </div>
          </div>
        )}
      </DialogContent>
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
    <>
      {/* 左侧：标签/分类列表 */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="flex flex-wrap gap-2 py-2">
          {items.map(([item, docs]) => {
            const isCurrent = currentItems.includes(item)
            const isSelected = selectedItem === item
            
            return (
              <button
                key={item}
                onClick={() => onItemClick(item)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                  isCurrent && "ring-2 ring-primary",
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : isCurrent
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {isCurrent && (
                  <Star className="h-3 w-3 fill-current" />
                )}
                <span>{item}</span>
                <span className={cn(
                  "text-xs opacity-70",
                  isSelected && "text-primary-foreground/70"
                )}>
                  ({docs.length})
                </span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* 右侧：关联文档列表 */}
      {selectedItem && (
        <div className="w-64 border-l border-border pl-4 overflow-y-auto">
          <div className="sticky top-0 bg-background py-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              "{selectedItem}" 的关联文档 ({selectedDocs.length})
            </h4>
          </div>
          <div className="space-y-1">
            {selectedDocs.map((doc) => {
              const fileName = doc.split('/').pop() || doc
              return (
                <button
                  key={doc}
                  onClick={() => onFileClick(doc)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md 
                             hover:bg-accent text-left transition-colors group"
                >
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate group-hover:text-primary">
                      {fileName}
                    </div>
                    {doc !== fileName && (
                      <div className="text-xs text-muted-foreground truncate">
                        {doc}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
