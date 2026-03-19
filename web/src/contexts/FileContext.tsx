import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
const QUERY_STALE_MS = 30 * 1000

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const wsMessage = useWebSocket('/ws')

  const fetchJson = useCallback(async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }, [])

  const filesQuery = useQuery({
    queryKey: ['files'],
    queryFn: () => fetchJson<{ files?: FileInfo[] }>('/api/files'),
    staleTime: QUERY_STALE_MS,
  })

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: () => fetchJson<{ tags?: Record<string, string[]>; categories?: Record<string, string[]> }>('/api/tags'),
    staleTime: QUERY_STALE_MS,
  })

  const menuQuery = useQuery({
    queryKey: ['menu'],
    queryFn: () => fetchJson<{ menu?: MenuItem[] }>('/api/menu'),
    staleTime: QUERY_STALE_MS,
  })

  const configQuery = useQuery({
    queryKey: ['config'],
    queryFn: () => fetchJson<{ defaultDoc?: string }>('/api/config'),
    staleTime: Infinity,
  })

  const urlPath = searchParams.get('path')
  const defaultDoc = configQuery.data?.defaultDoc || 'README.md'
  const currentFile = urlPath || (configQuery.isSuccess ? defaultDoc : null)

  useEffect(() => {
    if (!urlPath && configQuery.isSuccess) {
      const next = new URLSearchParams(searchParams)
      next.set('path', defaultDoc)
      setSearchParams(next, { replace: true })
    }
  }, [urlPath, defaultDoc, configQuery.isSuccess, searchParams, setSearchParams])

  const fileQuery = useQuery({
    queryKey: ['file', currentFile],
    queryFn: () => fetchJson<{ content?: string; tags?: string[]; categories?: string[] }>(
      `/api/file?path=${encodeURIComponent(currentFile!)}`
    ),
    enabled: Boolean(currentFile),
    staleTime: 5 * 1000,
    placeholderData: previousData => previousData,
  })

  const loadFile = useCallback(async (path: string, updateUrl = true) => {
    if (!path) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('path', path)
      return next
    }, { replace: !updateUrl })
  }, [setSearchParams])
  
  const handleFileSelect = useCallback((path: string) => {
    loadFile(path)
  }, [loadFile])

  const handleOutlineChange = useCallback((newOutline: OutlineItem[]) => {
    setOutline(newOutline)
  }, [])

  const refreshFiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['files'] })
  }, [queryClient])

  const invalidateTreeRelatedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['files'] })
    queryClient.invalidateQueries({ queryKey: ['tags'] })
    queryClient.invalidateQueries({ queryKey: ['menu'] })
  }, [queryClient])

  // WebSocket 消息处理
  useEffect(() => {
    if (wsMessage) {
      try {
        const msg = JSON.parse(wsMessage)
        if (msg.type === 'reload' && currentFile && msg.path === currentFile) {
          queryClient.invalidateQueries({ queryKey: ['file', currentFile] })
        } else if (msg.type === 'tree_reload') {
          invalidateTreeRelatedQueries()
        }
      } catch (error) {
        console.error('Failed to parse websocket message:', error)
      }
    }
  }, [wsMessage, currentFile, queryClient, invalidateTreeRelatedQueries])

  const value: FileContextValue = {
    files: filesQuery.data?.files || [],
    currentFile,
    content: fileQuery.data?.content || '',
    outline,
    loading: configQuery.isPending || fileQuery.isPending,
    tags: fileQuery.data?.tags || [],
    categories: fileQuery.data?.categories || [],
    allTags: tagsQuery.data?.tags || {},
    allCategories: tagsQuery.data?.categories || {},
    menuItems: menuQuery.data?.menu || [],
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
