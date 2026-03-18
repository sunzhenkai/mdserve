import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { FileInfo } from '../types'

interface FileTreeProps {
  files: FileInfo[]
  onSelect: (path: string) => void
  selectedPath: string | null
}

interface TreeNodeProps {
  item: FileInfo
  onSelect: (path: string) => void
  selectedPath: string | null
  depth: number
}

function TreeNode({ item, onSelect, selectedPath, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isDirectory = item.type === 'directory'
  const isSelected = item.path === selectedPath

  const handleClick = () => {
    if (isDirectory) {
      setExpanded(!expanded)
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
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
      
      {isDirectory && expanded && item.children && (
        <div className="tree-children">
          {item.children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, onSelect, selectedPath }: FileTreeProps) {
  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-2">
          {files.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">暂无文件</div>
          ) : (
            files.map((file) => (
              <TreeNode
                key={file.path}
                item={file}
                onSelect={onSelect}
                selectedPath={selectedPath}
                depth={0}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
