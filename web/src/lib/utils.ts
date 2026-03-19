import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 高亮文本中的关键词
 * @param text 原始文本
 * @param query 搜索关键词
 * @returns React 节点，关键词被 <mark> 标签包裹
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text
  }

  // 转义正则特殊字符
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  const parts = text.split(regex)

  if (parts.length === 1) {
    return text
  }

  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return React.createElement(
        'mark',
        { key: index, className: 'search-highlight' },
        part
      )
    }
    return part
  })
}

/**
 * 从 localStorage 获取搜索历史
 */
export function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem('mdserve-search-history')
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
}

/**
 * 保存搜索历史到 localStorage
 */
export function saveSearchHistory(query: string): void {
  if (!query.trim()) return

  try {
    let history = getSearchHistory()
    // 移除重复项
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase())
    // 添加到开头
    history.unshift(query)
    // 最多保留 5 条
    history = history.slice(0, 5)
    localStorage.setItem('mdserve-search-history', JSON.stringify(history))
  } catch {
    // ignore
  }
}

/**
 * 清除搜索历史
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem('mdserve-search-history')
  } catch {
    // ignore
  }
}
