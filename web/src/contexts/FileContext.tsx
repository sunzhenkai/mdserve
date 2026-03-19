import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { FileInfo, OutlineItem, MenuItem } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'

type FileContextState = {
  // 文件树
  files: FileInfo[]
  // 当前文件
  currentFile: string | null
  // 文件内容
  content: string
  // 文档大纲
  outline: OutlineItem[]
  // 加载状态
  loading: boolean
  // 当前文件的标签和分类
  tags: string[]
  categories: string[]
  // 全局标签和分类数据
  allTags: Record<string, string[]>
  allCategories: Record<string, string[]>
  // 菜单数据
  menuItems: MenuItem[]
}

type FileContextActions = {
  loadFile: (path: string, updateUrl?: boolean) => Promise<void>
  handleFileSelect: (path: string) => void
  handleOutlineChange: (outline: OutlineItem[]) => void
  refreshFiles: () => void
}

type FileContextValue = FileContextState & FileContextActions

const FileContext = createContext<FileContextValue | null>(null)

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [allTags, setAllTags] = useState<Record<string, string[]>>({})
  const [allCategories, setAllCategories] = useState<Record<string, string[]>>({})
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  
  const wsMessage = useWebSocket('/ws')
  const currentFileRef = useRef<string | null>(null)
  const defaultDocRef = useRef<string>('README.md')

  useEffect(() => {
    currentFileRef.current = currentFile
  }, [currentFile])

  const fetchJson = useCallback(async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }, [])

  // 加载文件树
  useEffect(() => {
    fetchJson<{ files?: FileInfo[] }>('/api/files')
      .then(data => setFiles(data.files || []))
      .catch(console.error)
  }, [fetchJson])

  // 加载全局标签和分类
  useEffect(() => {
    fetchJson<{ tags?: Record<string, string[]>; categories?: Record<string, string[]> }>('/api/tags')
      .then(data => {
        setAllTags(data.tags || {})
        setAllCategories(data.categories || {})
      })
      .catch(console.error)
  }, [fetchJson])

  // 加载菜单
  useEffect(() => {
    fetchJson<{ menu?: MenuItem[] }>('/api/menu')
      .then(data => setMenuItems(data.menu || []))
      .catch(console.error)
  }, [fetchJson])

  const loadFile = useCallback(async (path: string, updateUrl = true) => {
    setLoading(true)
    try {
      const data = await fetchJson<{ content?: string; tags?: string[]; categories?: string[] }>(
        `/api/file?path=${encodeURIComponent(path)}`
      )
      setContent(data.content || '')
      setTags(data.tags || [])
      setCategories(data.categories || [])
      setCurrentFile(path)
      
      if (updateUrl) {
        const url = new URL(window.location.href)
        const currentPathInUrl = url.searchParams.get('path')
        if (currentPathInUrl !== path) {
          url.searchParams.set('path', path)
          window.history.pushState({}, '', url.toString())
        }
      }
    } catch (error) {
      console.error('Failed to load file:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchJson])
  
  const handleFileSelect = useCallback((path: string) => {
    loadFile(path)
  }, [loadFile])

  const handleOutlineChange = useCallback((newOutline: OutlineItem[]) => {
    setOutline(newOutline)
  }, [])

  const refreshFiles = useCallback(() => {
    fetchJson<{ files?: FileInfo[] }>('/api/files')
      .then(data => setFiles(data.files || []))
      .catch(console.error)
  }, [fetchJson])

  const syncFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const path = params.get('path')
    if (path) {
      if (path !== currentFileRef.current) {
        loadFile(path, false)
      }
      return
    }

    const fallback = defaultDocRef.current || 'README.md'
    if (fallback !== currentFileRef.current) {
      loadFile(fallback, false)
    }
  }, [loadFile])

  // 加载配置并处理初始文件
  useEffect(() => {
    fetchJson<{ defaultDoc?: string }>('/api/config')
      .then(data => {
        defaultDocRef.current = data.defaultDoc || 'README.md'
      })
      .catch(err => {
        console.error('Failed to load config:', err)
        defaultDocRef.current = 'README.md'
      })
      .finally(syncFromUrl)
  }, [fetchJson, syncFromUrl])

  // WebSocket 消息处理
  useEffect(() => {
    if (wsMessage) {
      const msg = JSON.parse(wsMessage)
      
      if (msg.type === 'reload' && currentFile && msg.path === currentFile) {
        loadFile(currentFile, false)
      } else if (msg.type === 'tree_reload') {
        refreshFiles()
      }
    }
  }, [wsMessage, currentFile, loadFile, refreshFiles])

  // 浏览器前进/后退处理
  useEffect(() => {
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [syncFromUrl])

  const value: FileContextValue = {
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
    loadFile,
    handleFileSelect,
    handleOutlineChange,
    refreshFiles,
  }

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  )
}

export function useFile() {
  const context = useContext(FileContext)
  if (!context) {
    throw new Error('useFile must be used within a FileProvider')
  }
  return context
}
