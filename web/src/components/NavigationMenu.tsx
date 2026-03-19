import React from "react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
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
  onCategorySelect 
}: NavigationMenuProps) {
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
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        {items.map((item) => (
          <NavigationMenuItem key={item.title}>
            {item.children && item.children.length > 0 ? (
              <>
                <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[200px] gap-1 p-2">
                    {item.children.map((child) => (
                      <ListItem
                        key={child.title}
                        title={child.title}
                        onClick={() => handleLeafClick(child)}
                      />
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                onClick={() => handleLeafClick(item)}
              >
                {item.title}
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

// 列表项组件
interface ListItemProps extends React.ComponentPropsWithoutRef<"button"> {
  title: string
}

const ListItem = React.forwardRef<HTMLButtonElement, ListItemProps>(
  ({ className, title, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <button
            ref={ref}
            className={cn(
              "block w-full select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-left text-sm",
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
          </button>
        </NavigationMenuLink>
      </li>
    )
  }
)
ListItem.displayName = "ListItem"
