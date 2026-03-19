import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Search, X, FileText, Loader2, Clock, Trash2, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, highlightText, getSearchHistory, saveSearchHistory, clearSearchHistory } from '@/lib/utils'
import { SearchResult } from '../types'

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileSelect: (path: string) => void
}

export function SearchModal({ open, onOpenChange, onFileSelect }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 加载搜索历史
  useEffect(() => {
    if (open) {
      setHistory(getSearchHistory())
      setShowHistory(true)
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(-1)
    }
  }, [open])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [])

  // 搜索函数
  const searchFiles = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
      setSelectedIndex(0) // 默认选中第一个结果
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 输入变化处理（防抖）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(-1)

    // 清理之前的定时器
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    if (!value.trim()) {
      setResults([])
      setShowHistory(true)
      return
    }

    setShowHistory(false)
    
    // 防抖搜索
    searchTimerRef.current = setTimeout(() => {
      searchFiles(value)
    }, 300)
  }

  // 选择文件
  const handleSelect = useCallback((path: string) => {
    // 保存搜索历史
    if (query.trim()) {
      saveSearchHistory(query.trim())
    }
    onFileSelect(path)
    onOpenChange(false)
  }, [query, onFileSelect, onOpenChange])

  // 清除输入
  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowHistory(true)
    inputRef.current?.focus()
  }

  // 点击历史记录
  const handleHistoryClick = (historQuery: string) => {
    setQuery(historQuery)
    setShowHistory(false)
    searchFiles(historQuery)
  }

  // 清除历史
  const handleClearHistory = () => {
    clearSearchHistory()
    setHistory([])
  }

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const itemsCount = showHistory ? history.length : results.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < itemsCount - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : itemsCount - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (showHistory && history[selectedIndex]) {
          handleHistoryClick(history[selectedIndex])
        } else if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].path)
        } else if (results.length > 0) {
          handleSelect(results[0].path)
        }
        break
      case 'Escape':
        e.preventDefault()
        onOpenChange(false)
        break
    }
  }

  // 滚动到选中项
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // 获取文件图标颜色
  const getFileIconColor = (path: string) => {
    if (path.endsWith('.md')) return 'text-blue-500'
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'text-blue-600'
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text-yellow-500'
    if (path.endsWith('.go')) return 'text-cyan-500'
    if (path.endsWith('.py')) return 'text-green-500'
    if (path.endsWith('.json')) return 'text-orange-500'
    if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'text-pink-500'
    return 'text-muted-foreground'
  }

  // 判断是否为 Mac
  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl w-[90vw] max-h-[70vh] p-0 gap-0 overflow-hidden shadow-2xl flex flex-col bg-background rounded-xl"
        hideClose
        // 覆盖默认的黑色遮罩层，使用更浅的遮罩
        overlayClassName="bg-black/40 backdrop-blur-sm"
      >
        {/* 搜索输入框 - VS Code 风格 - 固定在顶部 */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="搜索文件名或内容..."
            className="flex-1 bg-transparent border-0 outline-none px-3 text-base placeholder:text-muted-foreground/60"
            autoComplete="off"
            spellCheck="false"
          />
          {loading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin flex-shrink-0" />
          ) : query ? (
            <button 
              onClick={handleClear} 
              className="p-1.5 hover:bg-accent rounded-md transition-colors flex-shrink-0"
              title="清除"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 hover:bg-accent rounded-md transition-colors flex-shrink-0"
              title="关闭"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* 搜索结果 / 历史记录 - 中间可滚动区域，固定高度 */}
        <div 
          ref={resultsRef}
          className="flex-1 min-h-0 overflow-y-auto max-h-[50vh]"
        >
          {/* 搜索历史 */}
          {showHistory && !query && history.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-1.5">
                <span className="text-xs font-medium text-muted-foreground">最近搜索</span>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  清除
                </button>
              </div>
              {history.map((item, index) => (
                <button
                  key={item}
                  data-index={index}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
                    selectedIndex === index && "bg-accent/50"
                  )}
                  onClick={() => handleHistoryClick(item)}
                >
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm">{item}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          )}

          {/* 空状态 - 无查询 */}
          {!query && history.length === 0 && (
            <div className="py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">输入关键词搜索文档</p>
              <p className="text-xs text-muted-foreground/60 mt-1">支持文件名和内容搜索</p>
            </div>
          )}

          {/* 加载状态 */}
          {query && loading && (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">搜索中...</p>
            </div>
          )}

          {/* 无结果 */}
          {query && !loading && results.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">未找到相关文档</p>
              <p className="text-xs text-muted-foreground/60 mt-1">尝试使用其他关键词</p>
            </div>
          )}

          {/* 搜索结果 */}
          {query && !loading && results.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1.5 text-xs text-muted-foreground border-b border-border/50">
                找到 {results.length} 个结果
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.path}-${index}`}
                  data-index={index}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors",
                    "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
                    selectedIndex === index && "bg-accent/50"
                  )}
                  onClick={() => handleSelect(result.path)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className={cn("h-4 w-4 mt-0.5 flex-shrink-0", getFileIconColor(result.path))} />
                    <div className="flex-1 min-w-0">
                      {/* 文件名 */}
                      <div className="font-medium text-sm">
                        {highlightText(result.name, query)}
                      </div>
                      {/* 文件路径 */}
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {highlightText(result.path, query)}
                      </div>
                      {/* 匹配内容 */}
                      {result.matches.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.matches.slice(0, 3).map((match, i) => (
                            <div 
                              key={i} 
                              className="text-xs text-muted-foreground/80 line-clamp-1 pl-2 border-l-2 border-border"
                            >
                              {highlightText(match, query)}
                            </div>
                          ))}
                          {result.matches.length > 3 && (
                            <div className="text-xs text-muted-foreground/50 pl-2">
                              +{result.matches.length - 3} 更多匹配
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedIndex === index && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部快捷键提示栏 - 固定在底部 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border text-[10px]">↓</kbd>
              <span>导航</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border text-[10px]">↵</kbd>
              <span>打开</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border text-[10px]">Esc</kbd>
              <span>关闭</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-background rounded border border-border text-[10px]">
              {isMac ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-background rounded border border-border text-[10px]">K</kbd>
            <span>快速搜索</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
