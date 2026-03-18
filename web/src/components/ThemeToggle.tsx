import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button 
      className="theme-toggle" 
      onClick={onToggle}
      title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  )
}
