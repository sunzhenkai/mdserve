import { useState, useEffect } from 'react'
import { Menu, List, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Tags } from 'lucide-react'
import { FileTree } from './components/FileTree'
import { MarkdownViewer } from './components/MarkdownViewer'
import { Outline } from './components/Outline'
import { SearchBar } from './components/SearchBar'
import { ThemeToggle } from './components/ThemeToggle'
import { TagsModal } from './components/TagsModal'
import { Button } from './components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet'
import { useWebSocket } from './hooks/useWebSocket'
import { useTheme } from './hooks/useTheme'
import { FileInfo, OutlineItem } from './types'

function App() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  
  // 桌面端折叠状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [outlineCollapsed, setOutlineCollapsed] = useState(false)
  
  // 移动端抽屉状态
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false)
  
  // Tags modal 状态
  const [tagsModalOpen, setTagsModalOpen] = useState(false)
  
  const { theme, toggleTheme } = useTheme()
  const wsMessage = useWebSocket('/ws')

  // 加载文件树
  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => setFiles(data.files || []))
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

  return (
    <div className={`h-screen flex flex-col ${theme}`}>
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
        {/* Left: Menu button (mobile) + Logo */}
        <div className="flex items-center gap-2">
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
        
        {/* Center: Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <SearchBar onFileSelect={handleFileSelect} />
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
          >
            <SearchBar onFileSelect={handleFileSelect} />
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
          
          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开文件列表' : '收起文件列表'}
          >
            {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          
          {/* Desktop outline toggle */}
          {outline.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setOutlineCollapsed(!outlineCollapsed)}
              title={outlineCollapsed ? '展开目录' : '收起目录'}
            >
              {outlineCollapsed ? <PanelRight className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
            </Button>
          )}
          
          {/* Tags button */}
          {(tags.length > 0 || categories.length > 0) && (
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
      <main className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (FileTree) */}
        {!sidebarCollapsed && (
          <aside className="hidden lg:flex flex-col bg-card border-r border-border w-72">
            <FileTree 
              files={files} 
              onSelect={handleFileSelect}
              selectedPath={currentFile}
            />
          </aside>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              加载中...
            </div>
          ) : content ? (
            <MarkdownViewer content={content} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              请从左侧选择一个 Markdown 文件开始浏览
            </div>
          )}
        </div>
        
        {/* Desktop Outline */}
        {outline.length > 0 && !outlineCollapsed && (
          <aside className="hidden lg:flex flex-col bg-card border-l border-border w-60">
            <Outline 
              items={outline} 
            />
          </aside>
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
        tags={tags}
        categories={categories}
      />
    </div>
  )
}

export default App
