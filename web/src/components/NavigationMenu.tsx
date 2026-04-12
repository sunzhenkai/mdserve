import { useState, useCallback } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MenuItem } from "@/types"

interface NavigationMenuProps {
  items: MenuItem[]
  onFileSelect: (path: string) => void
  onTagSelect: (tag: string) => void
  onCategorySelect: (category: string) => void
}

export function NavigationMenuWrapper({
  items,
  onFileSelect,
  onTagSelect,
  onCategorySelect,
}: NavigationMenuProps) {
  const handleLeafClick = (item: MenuItem) => {
    if (item.type === "doc" && item.path) {
      onFileSelect(item.path)
    } else if (item.type === "tag" && item.tag) {
      onTagSelect(item.tag)
    } else if (item.type === "category" && item.path) {
      onCategorySelect(item.path)
    }
  }

  if (items.length === 0) return null

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {items.map((item) =>
        item.children && item.children.length > 0 ? (
          <NavItemWithDropdown
            key={item.title}
            item={item}
            onLeafClick={handleLeafClick}
          />
        ) : (
          <button
            key={item.title}
            onClick={() => handleLeafClick(item)}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-md px-4 py-2",
              "text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:bg-accent focus:text-accent-foreground focus:outline-none",
              "cursor-pointer"
            )}
          >
            {item.title}
          </button>
        )
      )}
    </nav>
  )
}

/* ---- 有子菜单的导航项：DropdownMenu + 悬停打开 ---- */

function NavItemWithDropdown({
  item,
  onLeafClick,
}: {
  item: MenuItem
  onLeafClick: (child: MenuItem) => void
}) {
  const [open, setOpen] = useState(false)
  const openTimerRef = useState<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useState<ReturnType<typeof setTimeout> | null>(null)

  // 悬停打开/关闭（带短延迟避免闪烁）
  const handlePointerEnter = useCallback(() => {
    if (closeTimerRef[0]) {
      clearTimeout(closeTimerRef[0])
      closeTimerRef[1](null)
    }
    const timer = setTimeout(() => setOpen(true), 50)
    openTimerRef[1](timer)
  }, [closeTimerRef, openTimerRef])

  const handlePointerLeave = useCallback(() => {
    if (openTimerRef[0]) {
      clearTimeout(openTimerRef[0])
      openTimerRef[1](null)
    }
    const timer = setTimeout(() => setOpen(false), 150)
    closeTimerRef[1](timer)
  }, [openTimerRef, closeTimerRef])

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1 rounded-md px-4 py-2",
            "text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:bg-accent focus:text-accent-foreground focus:outline-none",
            "data-[state=open]:bg-accent/50",
            "cursor-pointer"
          )}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {item.title}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "z-50 min-w-[180px] rounded-md border bg-popover p-1.5 shadow-md",
            "data-[state=open]:animate-[fade-in_0.15s_ease-out]",
            "data-[state=closed]:animate-[fade-out_0.1s_ease-in]"
          )}
          align="start"
          sideOffset={4}
          onPointerEnter={() => {
            if (closeTimerRef[0]) {
              clearTimeout(closeTimerRef[0])
              closeTimerRef[1](null)
            }
          }}
          onPointerLeave={handlePointerLeave}
        >
          {item.children!.map((child) => (
            <DropdownMenu.Item
              key={child.title}
              className={cn(
                "flex cursor-pointer select-none items-center rounded-sm px-3 py-2",
                "text-sm outline-none transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              )}
              onClick={() => {
                onLeafClick(child)
                setOpen(false)
              }}
            >
              {child.title}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
