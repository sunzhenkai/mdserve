import { useState, useEffect } from 'react'
import { Menu, List, ChevronLeft, ChevronRight, Tags, Search } from 'lucide-react'
import { FileTree } from './components/FileTree'
import { MarkdownViewer } from './components/MarkdownViewer'
import { Outline } from './components/Outline'
import { ThemeToggle } from './components/ThemeToggle'
import { TagsModal } from './components/TagsModal'
import { DocumentInfo } from './components/DocumentInfo'
import { NavigationMenu } from './components/NavigationMenu'
import { SearchModal } from './components/SearchModal'
import { Button } from './components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet'
import { useWebSocket } from './hooks/useWebSocket'
import { useTheme } from './hooks/useTheme'
import { FileInfo, OutlineItem, MenuItem } from './types'

function App() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  
  // 全局标签和分类数据
  const [allTags, setAllTags] = useState<Record<string, string[]>>({})
  const [allCategories, setAllCategories] = useState<Record<string, string[]>>({})
  
  // 菜单数据
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  
  // 桌面端折叠状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [outlineCollapsed, setOutlineCollapsed] = useState(false)
  
  // 移动端抽屉状态
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  
  // Tags modal 状态
  const [tagsModalOpen, setTagsModalOpen] = useState(false)
  const [tagsModalTab, setTagsModalTab] = useState<'tags' | 'categories' | undefined>(undefined)
  const [tagsModalSelected, setTagsModalSelected] = useState<string | undefined>(undefined)
  
  const { theme, toggleTheme } = useTheme()
  const wsMessage = useWebSocket('/ws')

  // 全局快捷键 Ctrl/Cmd+K 打开搜索
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setMobileSearchOpen(true)
      }
    }
    
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // 加载文件树
  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => setFiles(data.files || []))
      .catch(console.error)
  }, [])

  // 加载全局标签和分类
  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => {
        setAllTags(data.tags || {})
        setAllCategories(data.categories || {})
      })
      .catch(console.error)
  }, [])

  // 加载菜单
  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => setMenuItems(data.menu || []))
      .catch(console.error)
  }, [])

  // WebSocket 消息处理 - 实时刷新
  useEffect(() => {
    if (wsMessage && currentFile) {
      const msg = JSON.parse(wsMessage)
      if (msg.type === 'reload' && msg.path === currentFile) {
        loadFile(currentFile)
      }
    }
  }, [wsMessage, currentFile])

  const loadFile = async (path: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      setContent(data.content || '')
      setOutline(data.outline || [])
      setTags(data.tags || [])
      setCategories(data.categories || [])
      setCurrentFile(path)
      // 移动端加载文件后关闭抽屉
      setMobileMenuOpen(false)
    } catch (error) {
      console.error('Failed to load file:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (path: string) => {
    loadFile(path)
  }

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    setTagsModalTab('tags')
    setTagsModalSelected(tag)
    setTagsModalOpen(true)
  }

  // 处理分类点击
  const handleCategoryClick = (category: string) => {
    setTagsModalTab('categories')
    setTagsModalSelected(category)
    setTagsModalOpen(true)
  }

  return (
    <div className={`h-screen flex flex-col ${theme}`}>
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
        {/* Left: Menu button (mobile) + Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary">mdserve</h1>
        </div>
        
        {/* Center: Navigation Menu */}
        <div className="flex-1 flex justify-center">
          <NavigationMenu 
            items={menuItems}
            onFileSelect={handleFileSelect}
            onTagSelect={handleTagClick}
            onCategorySelect={handleCategoryClick}
          />
        </div>
        
        {/* Right: Search + Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSearchOpen(true)}
            title="搜索 (Ctrl+K)"
            className="relative"
          >
            <Search className="h-5 w-5" />
          </Button>
          
          {/* Outline button (mobile) */}
          {outline.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOutlineOpen(true)}
            >
              <List className="h-5 w-5" />
            </Button>
          )}
          
          {/* Tags button - always show if there are any tags or categories in the system */}
          {(Object.keys(allTags).length > 0 || Object.keys(allCategories).length > 0) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTagsModalOpen(true)}
              title="查看标签和分类"
            >
              <Tags className="h-5 w-5" />
            </Button>
          )}
          
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar (FileTree) */}
        {!sidebarCollapsed ? (
          <aside className="hidden lg:flex flex-col bg-card border-r border-border w-72 relative">
            <FileTree 
              files={files} 
              onSelect={handleFileSelect}
              selectedPath={currentFile}
            />
            {/* 右边缘中间的收起按钮 */}
            <button 
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 
                         w-5 h-12 flex items-center justify-center
                         bg-card border border-border rounded-r-md shadow-sm
                         hover:bg-accent hover:w-6 transition-all cursor-pointer"
              onClick={() => setSidebarCollapsed(true)}
              title="收起文件列表"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          </aside>
        ) : (
          /* 收起状态：左边缘展开按钮 */
          <button 
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10
                       w-5 h-12 items-center justify-center
                       bg-card border border-border rounded-r-md shadow-sm
                       hover:bg-accent hover:w-6 transition-all cursor-pointer"
            onClick={() => setSidebarCollapsed(false)}
            title="展开文件列表"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              加载中...
            </div>
          ) : content ? (
            <>
              <DocumentInfo 
                path={currentFile}
                tags={tags}
                categories={categories}
                onTagClick={handleTagClick}
                onCategoryClick={handleCategoryClick}
              />
              <MarkdownViewer content={content} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              请从左侧选择一个 Markdown 文件开始浏览
            </div>
          )}
        </div>
        
        {/* Desktop Outline */}
        {outline.length > 0 && (
          !outlineCollapsed ? (
            <aside className="hidden lg:flex flex-col bg-card border-l border-border w-60 relative">
              <Outline 
                items={outline} 
              />
              {/* 左边缘中间的收起按钮 */}
              <button 
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 
                           w-5 h-12 flex items-center justify-center
                           bg-card border border-border rounded-l-md shadow-sm
                           hover:bg-accent hover:w-6 transition-all cursor-pointer"
                onClick={() => setOutlineCollapsed(true)}
                title="收起目录"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </aside>
          ) : (
            /* 收起状态：右边缘展开按钮 */
            <button 
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10
                         w-5 h-12 items-center justify-center
                         bg-card border border-border rounded-l-md shadow-sm
                         hover:bg-accent hover:w-6 transition-all cursor-pointer"
              onClick={() => setOutlineCollapsed(false)}
              title="展开目录"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        )}
      </main>
      
      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>文件列表</SheetTitle>
          </SheetHeader>
          <FileTree 
            files={files} 
            onSelect={handleFileSelect}
            selectedPath={currentFile}
          />
        </SheetContent>
      </Sheet>
      
      {/* Mobile Outline Sheet */}
      <Sheet open={mobileOutlineOpen} onOpenChange={setMobileOutlineOpen}>
        <SheetContent side="right" className="w-60 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>目录</SheetTitle>
          </SheetHeader>
          <Outline 
            items={outline} 
          />
        </SheetContent>
      </Sheet>
      
      {/* Tags Modal */}
      <TagsModal 
        open={tagsModalOpen}
        onOpenChange={setTagsModalOpen}
        allTags={allTags}
        allCategories={allCategories}
        currentTags={tags}
        currentCategories={categories}
        onFileSelect={handleFileSelect}
        initialTab={tagsModalTab}
        initialSelected={tagsModalSelected}
      />

      {/* Search Modal */}
      <SearchModal
        open={mobileSearchOpen}
        onOpenChange={setMobileSearchOpen}
        onFileSelect={handleFileSelect}
      />
    </div>
  )
}

export default App
