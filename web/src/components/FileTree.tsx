import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder } from 'lucide-react'
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
        className={`tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            <span className="tree-icon">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <Folder size={16} className="folder-icon" />
          </>
        ) : (
          <>
            <span className="tree-icon-spacer" />
            <FileText size={16} className="file-icon" />
          </>
        )}
        <span className="tree-name">{item.name}</span>
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
    <div className="file-tree">
      <div className="file-tree-header">
        <h3>文件列表</h3>
      </div>
      <div className="file-tree-content">
        {files.length === 0 ? (
          <div className="empty-tree">暂无文件</div>
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
    </div>
  )
}
