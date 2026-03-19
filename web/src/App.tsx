import { Menu, List, ChevronLeft, ChevronRight, Tags, Search } from 'lucide-react'
import { FileTree } from './components/FileTree'
import { MarkdownViewer } from './components/MarkdownViewer'
import { Outline } from './components/Outline'
import { ThemeToggle } from './components/ThemeToggle'
import { TagsModal } from './components/TagsModal'
import { DocumentInfo } from './components/DocumentInfo'
import { NavigationMenuWrapper } from './components/NavigationMenu'
import { SearchModal } from './components/SearchModal'
import { Button } from './components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet'
import { FileProvider, UIProvider, useFile, useUI } from './contexts'

function AppContent() {
  const {
    files,
    currentFile,
    content,
    outline,
    loading,
    tags,
    categories,
    allTags,
    allCategories,
    menuItems,
    handleFileSelect: baseHandleFileSelect,
    handleOutlineChange,
  } = useFile()

  const {
    sidebarCollapsed,
    outlineCollapsed,
    mobileMenuOpen,
    mobileOutlineOpen,
    mobileSearchOpen,
    tagsModalOpen,
    tagsModalTab,
    tagsModalSelected,
    setSidebarCollapsed,
    setOutlineCollapsed,
    setMobileMenuOpen,
    setMobileOutlineOpen,
    setMobileSearchOpen,
    setTagsModalOpen,
    openTagsModal,
  } = useUI()

  // 包装 handleFileSelect，加载文件后关闭移动端菜单
  const handleFileSelect = (path: string) => {
    baseHandleFileSelect(path)
    setMobileMenuOpen(false)
  }

  const handleTagClick = (tag: string) => {
    openTagsModal('tags', tag)
  }

  const handleCategoryClick = (category: string) => {
    openTagsModal('categories', category)
  }

  return (
    <div className="h-screen flex flex-col">
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
          <NavigationMenuWrapper
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
          
          {/* Tags button */}
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
          
          <ThemeToggle />
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
            <button 
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 
                         w-4 h-11 flex items-center justify-center
                         bg-card border border-border rounded-r-md shadow-sm
                         opacity-60 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
              onClick={() => setSidebarCollapsed(true)}
              title="收起文件列表"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          </aside>
        ) : (
          <button 
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10
                       w-4 h-11 items-center justify-center
                       bg-card border border-border rounded-r-md shadow-sm
                       opacity-60 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
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
              <MarkdownViewer content={content} onOutlineChange={handleOutlineChange} />
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
              <button 
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 
                           w-4 h-11 flex items-center justify-center
                           bg-card border border-border rounded-l-md shadow-sm
                           opacity-60 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
                onClick={() => setOutlineCollapsed(true)}
                title="收起目录"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </aside>
          ) : (
            <button 
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10
                         w-4 h-11 items-center justify-center
                         bg-card border border-border rounded-l-md shadow-sm
                         opacity-60 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
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

function App() {
  return (
    <FileProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </FileProvider>
  )
}

export default App
