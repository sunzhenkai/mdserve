import { useEffect, useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, ListPlus, ListMinus } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OutlineItem } from '../types'

interface OutlineProps {
  items: OutlineItem[]
}

interface OutlineNode {
  item: OutlineItem
  children: OutlineNode[]
}

// 将扁平的 outline 列表转换为树形结构
function buildOutlineTree(items: OutlineItem[]): OutlineNode[] {
  if (items.length === 0) return []

  const root: OutlineNode[] = []
  const stack: OutlineNode[] = []

  for (const item of items) {
    const node: OutlineNode = { item, children: [] }

    // 找到合适的父节点
    while (stack.length > 0 && stack[stack.length - 1].item.level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  }

  return root
}

interface TreeNodeProps {
  node: OutlineNode
  expandedItems: Set<string>
  toggleExpand: (slug: string) => void
  depth: number
}

function TreeNode({ node, expandedItems, toggleExpand, depth }: TreeNodeProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedItems.has(node.item.slug)
  const levelClass = depth + 1

  const handleClick = () => {
    const element = document.getElementById(node.item.slug)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleExpand(node.item.slug)
  }

  return (
    <div>
      <div
        className={cn(
          "flex w-max min-w-full items-center gap-1 py-1.5 cursor-pointer rounded-md transition-colors hover:bg-accent hover:text-accent-foreground group",
          levelClass === 1 && "font-medium",
          levelClass >= 3 && "text-xs",
          levelClass >= 4 && "text-xs opacity-80"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4" />
        )}
        <span
          className="text-sm whitespace-nowrap"
          onClick={handleClick}
        >
          {node.item.text}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.item.slug}
              node={child}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Outline({ items }: OutlineProps) {
  // 构建树形结构
  const tree = useMemo(() => buildOutlineTree(items), [items])

  // 收集所有有子节点的 slug
  const allExpandableSlugs = useMemo(() => {
    const slugs = new Set<string>()
    const collect = (nodes: OutlineNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          slugs.add(node.item.slug)
        }
        collect(node.children)
      }
    }
    collect(tree)
    return slugs
  }, [tree])

  // 使用稳定的字符串 key 追踪“目录结构变化”，以便切换文档后默认全展开
  const allExpandableSlugsKey = useMemo(() => {
    return Array.from(allExpandableSlugs).sort().join('|')
  }, [allExpandableSlugs])

  // 展开状态
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // 默认全部展开
    return new Set(allExpandableSlugs)
  })

  useEffect(() => {
    // 目录结构变化时重置为“全部展开”，避免切换文档后保留上一个文档的展开状态
    setExpandedItems(new Set(allExpandableSlugs))
  }, [allExpandableSlugsKey])

  // 切换单个项目
  const toggleExpand = (slug: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  // 全部展开
  const expandAll = () => {
    setExpandedItems(new Set(allExpandableSlugs))
  }

  // 全部折叠
  const collapseAll = () => {
    setExpandedItems(new Set())
  }

  // 判断是否全部展开
  const isAllExpanded = allExpandableSlugs.size === expandedItems.size && allExpandableSlugs.size > 0
  // 判断是否全部折叠
  const isAllCollapsed = expandedItems.size === 0 && allExpandableSlugs.size > 0

  if (items.length === 0) return null

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-muted-foreground">目录</span>
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

      {/* 目录内容 */}
      <ScrollArea className="flex-1">
        <nav className="p-2 w-max min-w-full">
          {tree.map((node) => (
            <TreeNode
              key={node.item.slug}
              node={node}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              depth={0}
            />
          ))}
        </nav>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
