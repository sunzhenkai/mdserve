import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'

interface NavigationMenuProps {
  items: MenuItem[]
  onFileSelect: (path: string) => void
  onTagSelect: (tag: string) => void
  onCategorySelect: (category: string) => void
}

export function NavigationMenu({ items, onFileSelect, onTagSelect, onCategorySelect }: NavigationMenuProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      // 切换下拉菜单
      setOpenDropdown(openDropdown === item.title ? null : item.title)
    } else {
      // 叶子节点，执行操作
      handleLeafClick(item)
      setOpenDropdown(null)
    }
  }

  const handleLeafClick = (item: MenuItem) => {
    if (item.type === 'doc' && item.path) {
      onFileSelect(item.path)
    } else if (item.type === 'tag' && item.tag) {
      onTagSelect(item.tag)
    } else if (item.type === 'category' && item.path) {
      onCategorySelect(item.path)
    }
  }

  if (items.length === 0) return null

  return (
    <nav ref={dropdownRef} className="hidden lg:flex items-center gap-1">
      {items.map((item) => (
        <div key={item.title} className="relative">
          <button
            onClick={() => handleItemClick(item)}
            className={cn(
              "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              openDropdown === item.title && "bg-accent text-accent-foreground"
            )}
          >
            {item.title}
            {item.children && item.children.length > 0 && (
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform",
                openDropdown === item.title && "rotate-180"
              )} />
            )}
          </button>

          {/* 下拉菜单 */}
          {item.children && item.children.length > 0 && openDropdown === item.title && (
            <div className="absolute top-full left-0 mt-1 min-w-40 bg-popover border border-border rounded-md shadow-lg z-50 py-1">
              {item.children.map((child) => (
                <button
                  key={child.title}
                  onClick={() => {
                    handleLeafClick(child)
                    setOpenDropdown(null)
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {child.title}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
