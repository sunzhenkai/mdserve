import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, ListPlus, ListMinus } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileInfo } from '../types'

interface FileTreeProps {
  files: FileInfo[]
  onSelect: (path: string) => void
  selectedPath: string | null
}

// 收集所有目录路径
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

interface TreeNodeProps {
  item: FileInfo
  onSelect: (path: string) => void
  selectedPath: string | null
  depth: number
  expandedPaths: Set<string>
  toggleExpand: (path: string) => void
}

function TreeNode({ item, onSelect, selectedPath, depth, expandedPaths, toggleExpand }: TreeNodeProps) {
  const isDirectory = item.type === 'directory'
  const isExpanded = expandedPaths.has(item.path)
  const isSelected = item.path === selectedPath

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
          "flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md transition-colors hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            <span className="flex items-center justify-center w-4 h-4 text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <Folder className="h-4 w-4 text-primary flex-shrink-0" />
          </>
        ) : (
          <>
            <span className="w-4 h-4" />
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </>
        )}
        <span className="text-sm truncate">{item.name}</span>
      </div>
      
      {isDirectory && isExpanded && item.children && (
        <div className="tree-children">
          {item.children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, onSelect, selectedPath }: FileTreeProps) {
  // 收集所有目录路径
  const allDirectoryPaths = useMemo(() => collectAllPaths(files), [files])
  
  // 排序后的文件列表（目录在前，按字母排序）
  const sortedFiles = useMemo(() => sortFiles(files), [files])

  // 展开状态 - 默认全部展开
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(allDirectoryPaths))

  // 当 selectedPath 改变时，自动展开所有父目录
  useEffect(() => {
    if (selectedPath) {
      const parentPaths = getParentPaths(selectedPath)
      setExpandedPaths(prev => {
        const next = new Set(prev)
        parentPaths.forEach(path => next.add(path))
        return next
      })
    }
  }, [selectedPath])

  // 切换单个目录
  const toggleExpand = (path: string) => {
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

  // 全部展开
  const expandAll = () => {
    setExpandedPaths(new Set(allDirectoryPaths))
  }

  // 全部折叠
  const collapseAll = () => {
    setExpandedPaths(new Set())
  }

  // 判断是否全部展开
  const isAllExpanded = allDirectoryPaths.size === expandedPaths.size && allDirectoryPaths.size > 0
  // 判断是否全部折叠
  const isAllCollapsed = expandedPaths.size === 0 && allDirectoryPaths.size > 0

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-muted-foreground">文件</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={expandAll}
            disabled={isAllExpanded}
            title="全部展开"
          >
            <ListPlus className="h-3.5 w-3.5" />
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
        <div className="p-2">
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
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
