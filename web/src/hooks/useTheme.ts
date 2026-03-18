import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // 从 localStorage 读取主题
    const saved = localStorage.getItem('mdserve-theme')
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
    // 默认跟随系统
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    // 保存主题到 localStorage
    localStorage.setItem('mdserve-theme', theme)
    // 应用主题到 document（使用 class 方式，适配 Tailwind）
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return { theme, toggleTheme }
}
