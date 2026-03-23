import { Menu, List, ChevronLeft, ChevronRight, Tags, Search, Maximize2, Minimize2, Download } from 'lucide-react'
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
import { useEffect, useRef } from 'react'
import { useState } from 'react'

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

  const [documentFullscreen, setDocumentFullscreen] = useState(false)
  const hasSidebarContent = files.length > 0
  const hasOutlineContent = outline.length > 0

  // 内容区滚动到顶部锚点（在 DocumentInfo 之前）
  const contentTopRef = useRef<HTMLDivElement>(null)
  // 内容区滚动容器：空闲时隐藏滚动条，滚动时显示
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const fullscreenScrollRef = useRef<HTMLDivElement>(null)
  const contentScrollbarHideTimerRef = useRef<number | null>(null)
  const fullscreenScrollbarHideTimerRef = useRef<number | null>(null)
  const prevFileRef = useRef<string | null>(null)
  const pendingTopScrollRef = useRef(false)

  // 当切换到新文档时，待加载完成后滚动到顶部
  useEffect(() => {
    if (!currentFile) return
    if (prevFileRef.current === null) {
      prevFileRef.current = currentFile
      return
    }
    if (prevFileRef.current !== currentFile) {
      pendingTopScrollRef.current = true
      prevFileRef.current = currentFile
    }
  }, [currentFile])

  useEffect(() => {
    if (!pendingTopScrollRef.current) return
    if (loading) return

    pendingTopScrollRef.current = false

    const el = contentTopRef.current
    if (!el) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 对齐 `MarkdownViewer` 的淡入淡出（120ms）与下一帧，减少“滚动中闪烁”的观感
    const timer = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      })
    }, 130)

    return () => window.clearTimeout(timer)
  }, [loading, currentFile])

  // 文章滚动条交互：不滚动自动隐藏；滚动时显示
  useEffect(() => {
    if (documentFullscreen) return
    const el = contentScrollRef.current
    if (!el) return

    const hide = () => el.classList.add('mdserve-scrollbar-hidden')
    const show = () => el.classList.remove('mdserve-scrollbar-hidden')

    // 初始隐藏，避免页面刚加载就出现滚动条
    hide()

    const handleScroll = () => {
      show()
      if (contentScrollbarHideTimerRef.current) {
        window.clearTimeout(contentScrollbarHideTimerRef.current)
      }
      contentScrollbarHideTimerRef.current = window.setTimeout(() => {
        hide()
      }, 700)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (contentScrollbarHideTimerRef.current) {
        window.clearTimeout(contentScrollbarHideTimerRef.current)
        contentScrollbarHideTimerRef.current = null
      }
    }
  }, [documentFullscreen, currentFile, loading])

  useEffect(() => {
    if (!documentFullscreen) return
    const el = fullscreenScrollRef.current
    if (!el) return

    const hide = () => el.classList.add('mdserve-scrollbar-hidden')
    const show = () => el.classList.remove('mdserve-scrollbar-hidden')

    hide()

    const handleScroll = () => {
      show()
      if (fullscreenScrollbarHideTimerRef.current) {
        window.clearTimeout(fullscreenScrollbarHideTimerRef.current)
      }
      fullscreenScrollbarHideTimerRef.current = window.setTimeout(() => {
        hide()
      }, 700)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (fullscreenScrollbarHideTimerRef.current) {
        window.clearTimeout(fullscreenScrollbarHideTimerRef.current)
        fullscreenScrollbarHideTimerRef.current = null
      }
    }
  }, [documentFullscreen, currentFile, loading])

  // 全屏：监听 ESC 退出 + 禁止底层滚动
  useEffect(() => {
    if (!documentFullscreen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setDocumentFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [documentFullscreen])

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

  const handleDownload = () => {
    if (!content || !currentFile) return

    // 获取文件名
    const fileName = currentFile.split('/').pop() || 'document.md'

    // 创建 Blob 并下载
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const hasDocumentInfo = Boolean(currentFile) || tags.length > 0 || categories.length > 0

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="relative z-40 h-12 mx-4 mt-2 mb-2 flex items-center justify-between px-3 rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm shadow-sm flex-shrink-0">
        {/* Left: Menu button (mobile) + Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          {/* 点睛之色 logo：浅浅墨绿色淡淡的强调 */}
          <h1 className="text-lg font-bold text-point">mdserve</h1>
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
            <Search className="h-4 w-4" />
          </Button>
          
          {/* Outline button (mobile) */}
          {outline.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOutlineOpen(true)}
            >
              <List className="h-4 w-4" />
            </Button>
          )}
          
          {/* Tags button */}
          {(Object.keys(allTags).length > 0 || Object.keys(allCategories).length > 0) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTagsModalOpen(true)}
              title="查看分类和标签"
            >
              <Tags className="h-4 w-4" />
            </Button>
          )}
          
          <ThemeToggle />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative gap-4 px-4 pb-4">
        {/* Desktop Sidebar (FileTree) */}
        {hasSidebarContent && (
          <>
            <aside
              className={`hidden lg:flex h-full relative flex-shrink-0 overflow-hidden transition-all duration-200 ease-out ${
                sidebarCollapsed ? 'w-0 min-w-0' : 'w-72 min-w-72'
              }`}
            >
              <div className="h-full w-full rounded-xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-sm relative z-30">
                <div className="h-full flex flex-col">
                  <FileTree
                    files={files}
                    onSelect={handleFileSelect}
                    selectedPath={currentFile}
                  />
                </div>
                <button
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-50
                             w-4 h-11 flex items-center justify-center
                             bg-card border border-border rounded-l-md shadow-sm
                             opacity-40 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
                  onClick={() => setSidebarCollapsed(true)}
                  title="收起文件列表"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </aside>

            {sidebarCollapsed && (
              <button
                className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-50
                           w-4 h-11 items-center justify-center
                           bg-card border border-border rounded-r-md shadow-sm
                           opacity-40 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
                onClick={() => setSidebarCollapsed(false)}
                title="展开文件列表"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </>
        )}
        
        {/* Center Column */}
        <div
          className={[
            'flex-1 min-w-0 flex flex-col gap-4 h-full',
            // 消除 flex gap 在“折叠侧栏宽度为 0 时仍然存在”的偏移，让文档 card 边缘与顶部导航对齐
            sidebarCollapsed ? '-ml-4' : '',
            outlineCollapsed ? '-mr-4' : '',
          ].join(' ')}
        >
          {loading ? (
            <div className="flex-1 min-h-0 rounded-xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-sm flex items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : content ? (
            <>
              {!documentFullscreen && (
                <div className="flex-1 min-h-0 rounded-xl border border-point-border bg-card/70 shadow-sm backdrop-blur-sm overflow-hidden relative flex flex-col z-0">
                  {/* Meta header — 放在滚动容器外，不受滚动条占位影响，始终撑满卡片宽度 */}
                  {hasDocumentInfo && (
                    <div className="relative bg-point-soft py-2 px-4 border-b border-border/70 flex-shrink-0">
                      <div className="absolute top-1/2 right-3 -translate-y-1/2 z-10 flex items-center gap-1">
                        <button
                          onClick={handleDownload}
                          className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                     border border-border/60 hover:bg-accent hover:text-accent-foreground
                                     opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                          title="下载文档"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDocumentFullscreen(true)}
                          className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                     border border-border/60 hover:bg-accent hover:text-accent-foreground
                                     opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                          title="全屏"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <DocumentInfo
                        path={currentFile}
                        tags={tags}
                        categories={categories}
                        onTagClick={handleTagClick}
                        onCategoryClick={handleCategoryClick}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div
                    ref={contentScrollRef}
                    className={`flex-1 min-h-0 overflow-y-auto px-4 pb-4 ${hasDocumentInfo ? 'pt-4' : 'pt-0'} relative mdserve-scrollbar-hidden`}
                  >
                    <div ref={contentTopRef} />

                    {!hasDocumentInfo && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                        <button
                          onClick={handleDownload}
                          className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                     border border-border/60 hover:bg-accent hover:text-accent-foreground
                                     opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                          title="下载文档"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDocumentFullscreen(true)}
                          className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                     border border-border/60 hover:bg-accent hover:text-accent-foreground
                                     opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                          title="全屏"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <MarkdownViewer
                      content={content}
                      currentFile={currentFile}
                      onNavigateToFile={handleFileSelect}
                      onOutlineChange={handleOutlineChange}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 min-h-0 rounded-xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-sm flex items-center justify-center text-muted-foreground px-6 text-center">
              请从左侧选择一个 Markdown 文件开始浏览
            </div>
          )}
        </div>
        
        {/* Desktop Outline */}
        {hasOutlineContent && (
          <>
            <aside
              className={`hidden lg:flex h-full relative flex-shrink-0 overflow-hidden transition-all duration-200 ease-out ${
                outlineCollapsed ? 'w-0 min-w-0' : 'w-72 min-w-72'
              }`}
            >
              <div className="h-full w-full rounded-xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-sm relative z-30">
                <div className="h-full flex flex-col">
                  <Outline items={outline} />
                </div>
                <button
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-50
                             w-4 h-11 flex items-center justify-center
                             bg-card border border-border rounded-r-md shadow-sm
                             opacity-40 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
                  onClick={() => setOutlineCollapsed(true)}
                  title="收起目录"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </aside>

            {outlineCollapsed && (
              <button
                className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-50
                           w-4 h-11 items-center justify-center
                           bg-card border border-border rounded-l-md shadow-sm
                           opacity-40 hover:opacity-100 hover:bg-accent hover:w-5 transition-all cursor-pointer"
                onClick={() => setOutlineCollapsed(false)}
                title="展开目录"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </>
        )}
      </main>
      
      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 min-w-72 flex-shrink-0 p-0">
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
        <SheetContent side="right" className="w-60 min-w-60 flex-shrink-0 p-0">
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

      {/* Document Fullscreen */}
      {documentFullscreen && content && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm">
          <div className="h-full flex flex-col gap-4 px-4 py-4">
            <div className="flex-1 min-h-0 rounded-xl border border-point-border bg-card/70 shadow-sm backdrop-blur-sm overflow-hidden relative flex flex-col">
              {/* Meta header — 放在滚动容器外，不受滚动条占位影响，始终撑满卡片宽度 */}
              {hasDocumentInfo && (
                <div className="relative bg-point-soft py-2 px-4 border-b border-border/70 flex-shrink-0">
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 z-10 flex items-center gap-1">
                    <button
                      onClick={handleDownload}
                      className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                 border border-border/60 hover:bg-accent hover:text-accent-foreground
                                 opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                      title="下载文档"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDocumentFullscreen(false)}
                      className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                 border border-border/60 hover:bg-accent hover:text-accent-foreground
                                 opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                      title="退出全屏 (Esc)"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <DocumentInfo
                    path={currentFile}
                    tags={tags}
                    categories={categories}
                    onTagClick={handleTagClick}
                    onCategoryClick={handleCategoryClick}
                  />
                </div>
              )}

              <div
                ref={fullscreenScrollRef}
                className={`flex-1 min-h-0 overflow-y-auto px-4 pb-4 ${hasDocumentInfo ? 'pt-4' : 'pt-0'} relative mdserve-scrollbar-hidden`}
              >
                {!hasDocumentInfo && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                    <button
                      onClick={handleDownload}
                      className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                 border border-border/60 hover:bg-accent hover:text-accent-foreground
                                 opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                      title="下载文档"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDocumentFullscreen(false)}
                      className="p-1 rounded-md bg-background/70 backdrop-blur-sm
                                 border border-border/60 hover:bg-accent hover:text-accent-foreground
                                 opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer"
                      title="退出全屏 (Esc)"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div ref={contentTopRef} />

                <MarkdownViewer
                  content={content}
                  currentFile={currentFile}
                  onNavigateToFile={handleFileSelect}
                  onOutlineChange={handleOutlineChange}
                />
              </div>
            </div>
          </div>
        </div>
      )}
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
