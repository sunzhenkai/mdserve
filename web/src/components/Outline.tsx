import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { OutlineItem } from '../types'

interface OutlineProps {
  items: OutlineItem[]
}

export function Outline({ items }: OutlineProps) {
  const handleClick = (slug: string) => {
    const element = document.getElementById(slug)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const minLevel = Math.min(...items.map(item => item.level))

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <nav className="p-2">
          {items.map((item, index) => {
            const levelClass = item.level - minLevel + 1
            return (
              <div
                key={index}
                className={cn(
                  "py-1.5 px-4 text-sm cursor-pointer rounded-md transition-colors hover:bg-accent hover:text-accent-foreground truncate",
                  levelClass === 1 && "font-medium",
                  levelClass === 3 && "text-xs",
                  levelClass === 4 && "text-xs opacity-80"
                )}
                style={{
                  paddingLeft: `${(levelClass - 1) * 12 + 16}px`
                }}
                onClick={() => handleClick(item.slug)}
              >
                {item.text}
              </div>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
