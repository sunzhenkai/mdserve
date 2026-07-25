import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, ChevronDown, FileText, FileCode, Folder, ListPlus, ListMinus, Target, Loader2, AlertCircle } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileInfo } from '../types'
import { useFile } from '@/contexts'

interface FileTreeProps {
  files: FileInfo[]
  onSelect: (path: string) => void
  selectedPath: string | null
}

// 收集所有目录路径（仅已加载到本地树中的）
function collectAllPaths(files: FileInfo[]): Set<string> {
  const paths = new Set<string>()
  const collect = (items: FileInfo[]) => {
    for (const item of items) {
      if (item.type === 'directory') {
        paths.add(item.path)
        if (item.children) {
          collect(item.children)
        }
      }
    }
  }
  collect(files)
  return paths
}

// 获取选中文件的所有父目录路径
function getParentPaths(selectedPath: string | null): string[] {
  if (!selectedPath) return []
  
  const parents: string[] = []
  const parts = selectedPath.split('/')
  
  // 从根目录开始，逐级添加父目录
  for (let i = 1; i < parts.length; i++) {
    parents.push(parts.slice(0, i).join('/'))
  }
  
  return parents
}

// 排序文件：目录在前，按字母排序
function sortFiles(files: FileInfo[]): FileInfo[] {
  return [...files]
    .sort((a, b) => {
      // 目录排在前面
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1
      // 同类型按字母顺序排序
      return a.name.localeCompare(b.name, 'zh-CN')
    })
    .map(file => ({
      ...file,
      children: file.children ? sortFiles(file.children) : undefined
    }))
}

function isHtmlFile(path: string): boolean {
  return /\.html?$/i.test(path)
}

interface TreeNodeProps {
  item: FileInfo
  onSelect: (path: string) => void
  selectedPath: string | null
  depth: number
  expandedPaths: Set<string>
  toggleExpand: (path: string) => void
  registerNodeRef: (path: string) => (el: HTMLDivElement | null) => void
  loadingDirectories: Set<string>
  failedDirectories: Set<string>
}

function TreeNode({
  item,
  onSelect,
  selectedPath,
  depth,
  expandedPaths,
  toggleExpand,
  registerNodeRef,
  loadingDirectories,
  failedDirectories,
}: TreeNodeProps) {
  const isDirectory = item.type === 'directory'
  const isExpanded = expandedPaths.has(item.path)
  const isSelected = item.path === selectedPath
  const isLoading = loadingDirectories.has(item.path)
  const isFailed = failedDirectories.has(item.path)

  const handleClick = () => {
    if (isDirectory) {
      toggleExpand(item.path)
    } else {
      onSelect(item.path)
    }
  }

  return (
    <div className="tree-node">
      <div 
        className={cn(
          "flex w-max min-w-full items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md transition-colors hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        ref={registerNodeRef(item.path)}
      >
        {isDirectory ? (
          <>
            <span className="flex items-center justify-center w-4 h-4 text-muted-foreground">
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <Folder className="h-4 w-4 text-primary flex-shrink-0" />
          </>
        ) : (
          <>
            <span className="w-4 h-4" />
            {isHtmlFile(item.path) ? (
              <FileCode className="h-4 w-4 text-orange-500 flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </>
        )}
        <span className="text-sm whitespace-nowrap">
          {item.name}
        </span>
        {isDirectory && isFailed && (
          <span title="加载失败，点击重试">
            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
          </span>
        )}
      </div>
      
      {isDirectory && isExpanded && (
        <div className="tree-children">
          {isLoading && item.children === undefined && (
            <div
              className="text-xs text-muted-foreground px-2 py-1"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              加载中...
            </div>
          )}
          {isFailed && item.children === undefined && !isLoading && (
            <div
              className="text-xs text-destructive px-2 py-1"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              加载失败，点击目录重试
            </div>
          )}
          {item.children?.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              registerNodeRef={registerNodeRef}
              loadingDirectories={loadingDirectories}
              failedDirectories={failedDirectories}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, onSelect, selectedPath }: FileTreeProps) {
  const {
    loadDirectoryChildren,
    loadFullTree,
    loadingDirectories,
    failedDirectories,
    setExpandedDirectories,
  } = useFile()

  // 收集所有目录路径
  const allDirectoryPaths = useMemo(() => collectAllPaths(files), [files])
  
  // 排序后的文件列表（目录在前，按字母排序）
  const sortedFiles = useMemo(() => sortFiles(files), [files])

  // 展开状态：默认折叠；根据 URL/选中文档仅展开“当前文档路径”
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set())
  const [expandAllLoading, setExpandAllLoading] = useState(false)

  // 同步展开集到 FileContext，供 tree_reload 后重拉
  useEffect(() => {
    setExpandedDirectories(expandedPaths)
  }, [expandedPaths, setExpandedDirectories])

  // 用于“定位”按钮滚动到当前文档节点
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const registerNodeRef = useCallback(
    (path: string) => (el: HTMLDivElement | null) => {
      if (!path) return
      nodeRefs.current.set(path, el)
    },
    []
  )

  // 当 selectedPath 改变时，仅展开选中文档的父目录链
  useEffect(() => {
    if (!selectedPath) {
      setExpandedPaths(new Set())
      return
    }

    const parentPaths = getParentPaths(selectedPath)
    setExpandedPaths(new Set(parentPaths))
  }, [selectedPath])

  // 展开时按需加载子节点（按深度顺序，避免父节点未合并时子路径找不到）
  useEffect(() => {
    const sorted = [...expandedPaths].sort(
      (a, b) => a.split('/').filter(Boolean).length - b.split('/').filter(Boolean).length
    )
    let cancelled = false
    ;(async () => {
      for (const path of sorted) {
        if (cancelled) return
        try {
          await loadDirectoryChildren(path)
        } catch {
          // 失败态由 failedDirectories 展示
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [expandedPaths, loadDirectoryChildren])

  // 切换单个目录；已展开且失败时点击重试加载
  const toggleExpand = (path: string) => {
    if (expandedPaths.has(path) && failedDirectories.has(path)) {
      void loadDirectoryChildren(path).catch(() => {})
      return
    }
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // 全部展开：优先一次拉全量树（服务端缓存），否则已加载节点全部展开
  const expandAll = async () => {
    setExpandAllLoading(true)
    try {
      const full = await loadFullTree()
      setExpandedPaths(collectAllPaths(full))
    } catch (error) {
      console.error('expandAll failed, falling back to loaded paths:', error)
      setExpandedPaths(new Set(allDirectoryPaths))
    } finally {
      setExpandAllLoading(false)
    }
  }

  // 全部折叠
  const collapseAll = () => {
    setExpandedPaths(new Set())
  }

  // 判断是否全部展开
  const isAllExpanded = allDirectoryPaths.size > 0 &&
    [...allDirectoryPaths].every((p) => expandedPaths.has(p)) &&
    !expandAllLoading
  // 判断是否全部折叠
  const isAllCollapsed = expandedPaths.size === 0 && allDirectoryPaths.size > 0

  const handleLocate = () => {
    if (!selectedPath) return

    // 确保选中文档的父链都展开，否则它可能还没被渲染出来
    const parentPaths = getParentPaths(selectedPath)
    setExpandedPaths(new Set(parentPaths))
    for (const dir of parentPaths) {
      void loadDirectoryChildren(dir).catch(() => {})
    }

    // 等待一次渲染完成后滚动到节点
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = nodeRefs.current.get(selectedPath)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-muted-foreground">文件</span>
        <div className="flex items-center gap-1">
          {selectedPath && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLocate}
              className="h-6 w-6"
              title="定位当前文档在文档树中的位置"
            >
              <Target className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => void expandAll()}
            disabled={isAllExpanded || expandAllLoading}
            title="全部展开"
          >
            {expandAllLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ListPlus className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={collapseAll}
            disabled={isAllCollapsed}
            title="全部折叠"
          >
            <ListMinus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 文件列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 w-max min-w-full">
          {sortedFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">暂无文件</div>
          ) : (
            sortedFiles.map((file) => (
              <TreeNode
                key={file.path}
                item={file}
                onSelect={onSelect}
                selectedPath={selectedPath}
                depth={0}
                expandedPaths={expandedPaths}
                toggleExpand={toggleExpand}
                registerNodeRef={registerNodeRef}
                loadingDirectories={loadingDirectories}
                failedDirectories={failedDirectories}
              />
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
