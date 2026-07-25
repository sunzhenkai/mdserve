import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileInfo, OutlineItem, MenuItem, FileFormat } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'

type FileContextState = {
  // 文件树（按需合并后的本地树）
  files: FileInfo[]
  // 文件树是否仍在加载（根层）
  filesLoading: boolean
  // 正在加载子节点的目录
  loadingDirectories: Set<string>
  // 子节点加载失败的目录
  failedDirectories: Set<string>
  // 当前文件
  currentFile: string | null
  // 文件内容
  content: string
  // 文档格式
  fileFormat: FileFormat
  // 文档大纲
  outline: OutlineItem[]
  // 加载状态
  loading: boolean
  // 当前文档是否加载失败（如 404）
  fileError: string | null
  // 当前文件的标签和分类
  tags: string[]
  categories: string[]
  // 全局标签和分类数据
  allTags: Record<string, string[]>
  allCategories: Record<string, string[]>
  // 菜单数据
  menuItems: MenuItem[]
  // Footer 文本
  footer: string
}

type FileContextActions = {
  loadFile: (path: string, updateUrl?: boolean) => void
  handleFileSelect: (path: string) => void
  handleOutlineChange: (outline: OutlineItem[]) => void
  refreshFiles: () => void
  /** 按需加载某目录的直接子节点并合并进树 */
  loadDirectoryChildren: (dirPath: string) => Promise<void>
  /** 一次拉取全量树（expandAll 优先走缓存全量） */
  loadFullTree: () => Promise<FileInfo[]>
  /** FileTree 同步当前展开集，供 tree_reload 后重拉 */
  setExpandedDirectories: (paths: Set<string>) => void
}

type FileContextValue = FileContextState & FileContextActions

const FileContext = createContext<FileContextValue | null>(null)
const QUERY_STALE_MS = 30 * 1000
const ROOT_DIR_KEY = ''

function decodePathParam(rawPath: string | null): string | null {
  if (!rawPath) return null
  let next = rawPath
  // 兼容外部分享时出现的重复编码（例如 %25E5...）
  for (let i = 0; i < 2; i += 1) {
    if (!/%[0-9a-fA-F]{2}/.test(next)) break
    try {
      const decoded = decodeURIComponent(next)
      if (decoded === next) break
      next = decoded
    } catch {
      break
    }
  }
  return next
}

function getParentPaths(filePath: string | null): string[] {
  if (!filePath) return []
  const parts = filePath.split('/').filter(Boolean)
  const parents: string[] = []
  for (let i = 1; i < parts.length; i += 1) {
    parents.push(parts.slice(0, i).join('/'))
  }
  return parents
}

function mergeChildren(tree: FileInfo[], dirPath: string, children: FileInfo[]): FileInfo[] {
  if (!dirPath) {
    return children
  }
  return tree.map((node) => {
    if (node.path === dirPath) {
      return { ...node, children }
    }
    if (node.children?.length) {
      return { ...node, children: mergeChildren(node.children, dirPath, children) }
    }
    return node
  })
}

function isDirectoryLoaded(tree: FileInfo[], dirPath: string): boolean {
  if (!dirPath) {
    return true
  }
  const find = (nodes: FileInfo[]): FileInfo | null => {
    for (const n of nodes) {
      if (n.path === dirPath) return n
      if (n.children?.length) {
        const found = find(n.children)
        if (found) return found
      }
    }
    return null
  }
  const node = find(tree)
  // children === undefined 表示尚未按需加载；[] 表示已加载且为空
  return Boolean(node && node.children !== undefined)
}

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const wsMessage = useWebSocket('/ws')

  const [files, setFiles] = useState<FileInfo[]>([])
  const [loadedDirs, setLoadedDirs] = useState<Set<string>>(() => new Set())
  const [loadingDirectories, setLoadingDirectories] = useState<Set<string>>(() => new Set())
  const [failedDirectories, setFailedDirectories] = useState<Set<string>>(() => new Set())
  const expandedDirsRef = useRef<Set<string>>(new Set())
  const filesRef = useRef<FileInfo[]>([])
  const loadedDirsRef = useRef<Set<string>>(new Set())
  const loadInflightRef = useRef<Map<string, Promise<void>>>(new Map())

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    loadedDirsRef.current = loadedDirs
  }, [loadedDirs])

  const fetchJson = useCallback(async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }, [])

  const fetchDirChildren = useCallback(async (dirPath: string): Promise<FileInfo[]> => {
    const params = new URLSearchParams({ depth: '1' })
    if (dirPath) {
      params.set('path', dirPath)
    }
    const data = await fetchJson<{ files?: FileInfo[] }>(`/api/files?${params}`)
    return data.files || []
  }, [fetchJson])

  const loadDirectoryChildren = useCallback(async (dirPath: string) => {
    const key = dirPath || ROOT_DIR_KEY
    if (loadedDirsRef.current.has(key) && isDirectoryLoaded(filesRef.current, dirPath)) {
      return
    }
    const existing = loadInflightRef.current.get(key)
    if (existing) {
      await existing
      return
    }

    const task = (async () => {
      setLoadingDirectories((prev) => new Set(prev).add(key))
      setFailedDirectories((prev) => {
        if (!prev.has(key)) return prev
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      try {
        const children = await fetchDirChildren(dirPath)
        setFiles((prev) => (dirPath ? mergeChildren(prev, dirPath, children) : children))
        setLoadedDirs((prev) => {
          const next = new Set(prev).add(key)
          loadedDirsRef.current = next
          return next
        })
      } catch (error) {
        console.error('Failed to load directory children:', dirPath, error)
        setFailedDirectories((prev) => new Set(prev).add(key))
        throw error
      } finally {
        setLoadingDirectories((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        loadInflightRef.current.delete(key)
      }
    })()

    loadInflightRef.current.set(key, task)
    await task
  }, [fetchDirChildren])

  const loadFullTree = useCallback(async () => {
    const data = await fetchJson<{ files?: FileInfo[] }>('/api/files')
    const tree = data.files || []
    setFiles(tree)
    // 全量树意味着所有已出现的目录都已加载
    const allDirs = new Set<string>([ROOT_DIR_KEY])
    const walk = (nodes: FileInfo[]) => {
      for (const n of nodes) {
        if (n.type === 'directory') {
          allDirs.add(n.path)
          if (n.children) walk(n.children)
        }
      }
    }
    walk(tree)
    loadedDirsRef.current = allDirs
    setLoadedDirs(allDirs)
    setFailedDirectories(new Set())
    return tree
  }, [fetchJson])

  const filesQuery = useQuery({
    queryKey: ['files', 'root', 'depth1'],
    queryFn: () => fetchDirChildren(''),
    staleTime: QUERY_STALE_MS,
  })

  // 根层浅层结果写入本地树（仅跟随 query 初次/主动刷新）
  useEffect(() => {
    if (!filesQuery.data) return
    setFiles(filesQuery.data)
    const next = new Set([ROOT_DIR_KEY])
    loadedDirsRef.current = next
    setLoadedDirs(next)
  }, [filesQuery.dataUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

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
    queryFn: () => fetchJson<{ defaultDoc?: string; footer?: string }>('/api/config'),
    staleTime: Infinity,
  })

  const rawUrlPath = searchParams.get('path')
  const urlPath = decodePathParam(rawUrlPath)
  const defaultDoc = configQuery.data?.defaultDoc || 'README.md'
  const currentFile = urlPath || (configQuery.isSuccess ? defaultDoc : null)

  useEffect(() => {
    if (!rawUrlPath || !urlPath) return
    if (rawUrlPath === urlPath) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('path', urlPath)
      return next
    }, { replace: true })
  }, [rawUrlPath, urlPath, setSearchParams])

  useEffect(() => {
    if (!urlPath && configQuery.isSuccess) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('path', defaultDoc)
        return next
      }, { replace: true })
    }
  }, [urlPath, defaultDoc, configQuery.isSuccess, setSearchParams])

  const fileQuery = useQuery({
    queryKey: ['file', currentFile],
    queryFn: () => fetchJson<{ content?: string; format?: FileFormat; tags?: string[]; categories?: string[]; resolvedPath?: string }>(
      `/api/file?path=${encodeURIComponent(currentFile!)}`
    ),
    enabled: Boolean(currentFile),
    staleTime: 5 * 1000,
    retry: (failureCount, error) => {
      // 404/400 无需重试，避免控制台刷屏且拖慢回退逻辑
      if (error instanceof Error && /Request failed: (404|400|403)/.test(error.message)) {
        return false
      }
      return failureCount < 2
    },
  })

  const fileFormat: FileFormat = fileQuery.data?.format === 'html' ? 'html' : 'markdown'

  // 如果服务端将目录路径解析为 README.md（如 docs/ → docs/README.md），同步更新 URL
  useEffect(() => {
    const resolvedPath = fileQuery.data?.resolvedPath
    if (!resolvedPath || !currentFile) return
    if (resolvedPath !== currentFile) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('path', resolvedPath)
        return next
      }, { replace: true })
    }
  }, [fileQuery.data?.resolvedPath, currentFile, setSearchParams])

  // 默认文档不存在时回退到 README.md，避免空白页 + 无效 path 占住 URL
  useEffect(() => {
    if (!fileQuery.isError || !currentFile || !configQuery.isSuccess) return
    if (currentFile !== defaultDoc) return
    if (defaultDoc === 'README.md') return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('path', 'README.md')
      return next
    }, { replace: true })
  }, [fileQuery.isError, currentFile, defaultDoc, configQuery.isSuccess, setSearchParams])

  // 深链：预取父路径链各层
  useEffect(() => {
    if (!currentFile || filesQuery.isPending) return
    const parents = getParentPaths(currentFile)
    let cancelled = false
    ;(async () => {
      for (const dir of parents) {
        if (cancelled) return
        try {
          await loadDirectoryChildren(dir)
        } catch {
          // 单层失败不阻断后续；FileTree 会显示失败态
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentFile, filesQuery.isPending, filesQuery.dataUpdatedAt, loadDirectoryChildren])

  const loadFile = useCallback((path: string, updateUrl = true) => {
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

  const setExpandedDirectories = useCallback((paths: Set<string>) => {
    expandedDirsRef.current = paths
  }, [])

  const reloadTreeForExpanded = useCallback(async () => {
    loadInflightRef.current.clear()
    loadedDirsRef.current = new Set()
    setLoadedDirs(new Set())
    setFailedDirectories(new Set())
    setFiles([])
    try {
      const rootChildren = await fetchDirChildren('')
      setFiles(rootChildren)
      const rootLoaded = new Set([ROOT_DIR_KEY])
      loadedDirsRef.current = rootLoaded
      setLoadedDirs(rootLoaded)
      // 按路径深度排序，确保父目录先于子目录合并
      const expanded = [...expandedDirsRef.current].sort(
        (a, b) => a.split('/').filter(Boolean).length - b.split('/').filter(Boolean).length
      )
      for (const dir of expanded) {
        try {
          const children = await fetchDirChildren(dir)
          setFiles((prev) => mergeChildren(prev, dir, children))
          setLoadedDirs((prev) => {
            const next = new Set(prev).add(dir)
            loadedDirsRef.current = next
            return next
          })
        } catch (error) {
          console.error('Failed to reload directory:', dir, error)
          setFailedDirectories((prev) => new Set(prev).add(dir))
        }
      }
    } catch (error) {
      console.error('Failed to reload file tree root:', error)
    }
  }, [fetchDirChildren])

  const refreshFiles = useCallback(() => {
    void reloadTreeForExpanded()
  }, [reloadTreeForExpanded])

  // WebSocket 消息处理
  useEffect(() => {
    if (wsMessage) {
      try {
        const msg = JSON.parse(wsMessage)
        if (msg.type === 'reload' && currentFile && msg.path === currentFile) {
          queryClient.invalidateQueries({ queryKey: ['file', currentFile] })
        } else if (msg.type === 'tree_reload') {
          // 树数据由 reloadTreeForExpanded 按需重拉，避免 filesQuery 回写覆盖已合并子树
          queryClient.invalidateQueries({ queryKey: ['tags'] })
          queryClient.invalidateQueries({ queryKey: ['menu'] })
          void reloadTreeForExpanded()
        }
      } catch (error) {
        console.error('Failed to parse websocket message:', error)
      }
    }
  }, [wsMessage, currentFile, queryClient, reloadTreeForExpanded])

  const value: FileContextValue = {
    files,
    filesLoading: filesQuery.isPending && files.length === 0,
    loadingDirectories,
    failedDirectories,
    currentFile,
    content: fileQuery.data?.content || '',
    fileFormat,
    outline,
    loading: configQuery.isPending || (Boolean(currentFile) && fileQuery.isPending && !fileQuery.isError),
    fileError: fileQuery.isError
      ? (fileQuery.error instanceof Error ? fileQuery.error.message : '文档加载失败')
      : null,
    tags: fileQuery.data?.tags || [],
    categories: fileQuery.data?.categories || [],
    allTags: tagsQuery.data?.tags || {},
    allCategories: tagsQuery.data?.categories || {},
    menuItems: menuQuery.data?.menu || [],
    footer: configQuery.data?.footer || '',
    loadFile,
    handleFileSelect,
    handleOutlineChange,
    refreshFiles,
    loadDirectoryChildren,
    loadFullTree,
    setExpandedDirectories,
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
