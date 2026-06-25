import { cn } from "@/lib/utils"
import { MenuItem } from "@/types"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

interface NavigationMenuProps {
  items: MenuItem[]
  onFileSelect: (path: string) => void
  onTagSelect: (tag: string) => void
  onCategorySelect: (category: string) => void
}

const submenuItemClassName = cn(
  "flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2",
  "text-sm outline-none transition-colors",
  "hover:bg-accent hover:text-accent-foreground",
  "focus:bg-accent focus:text-accent-foreground"
)

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
    <NavigationMenu
      className="hidden max-w-none flex-1 justify-start lg:flex"
      delayDuration={200}
      skipDelayDuration={300}
    >
      <NavigationMenuList>
        {items.map((item) =>
          item.children && item.children.length > 0 ? (
            <NavigationMenuItem key={item.title}>
              <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid min-w-[180px] gap-0 p-1.5">
                  {item.children.map((child) => (
                    <li key={child.title}>
                      <NavigationMenuLink asChild>
                        <button
                          type="button"
                          className={submenuItemClassName}
                          onClick={() => handleLeafClick(child)}
                        >
                          {child.title}
                        </button>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.title}>
              <NavigationMenuLink asChild>
                <button
                  type="button"
                  className={cn(navigationMenuTriggerStyle(), "cursor-pointer")}
                  onClick={() => handleLeafClick(item)}
                >
                  {item.title}
                </button>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )
        )}
      </NavigationMenuList>
      <NavigationMenuViewport />
    </NavigationMenu>
  )
}
