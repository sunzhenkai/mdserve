import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getTitle = () => {
    switch (theme) {
      case 'light': return '亮色模式 (点击切换到暗色)'
      case 'dark': return '暗色模式 (点击跟随系统)'
      case 'system': return '跟随系统 (点击切换到亮色)'
      default: return '切换主题'
    }
  }

  const Icon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-5 w-5" />
      case 'dark': return <Moon className="h-5 w-5" />
      case 'system': return <Monitor className="h-5 w-5" />
      default: return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={getTitle()}
    >
      <Icon />
    </Button>
  )
}
