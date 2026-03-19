import type { Highlighter } from 'shiki'

export type { Highlighter }

let highlighterInstance: Highlighter | null = null
let highlighterPromise: Promise<Highlighter> | null = null

/**
 * 获取 Shiki highlighter 实例（单例模式）
 * 使用缓存避免重复初始化
 */
export async function getHighlighter(): Promise<Highlighter> {
  // 如果已经初始化，直接返回
  if (highlighterInstance) {
    return highlighterInstance
  }

  // 如果正在初始化，等待初始化完成
  if (highlighterPromise) {
    return highlighterPromise
  }

  // 开始初始化
  highlighterPromise = import('shiki').then(({ createHighlighter }) =>
    createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        // 最小预加载，其他语言按需加载
        'text',
        'plaintext',
        'markdown',
        'javascript',
        'typescript',
        'json',
        'bash',
      ],
    })
  )

  highlighterInstance = await highlighterPromise
  return highlighterInstance
}

/**
 * 检查语言是否已加载
 */
export function isLanguageLoaded(highlighter: Highlighter, lang: string): boolean {
  return highlighter.getLoadedLanguages().includes(lang)
}

/**
 * 动态加载语言（如果需要）
 */
export async function loadLanguageIfNeeded(
  highlighter: Highlighter,
  lang: string
): Promise<void> {
  if (!isLanguageLoaded(highlighter, lang)) {
    try {
      await highlighter.loadLanguage(lang as any)
    } catch (error) {
      console.warn(`Failed to load language: ${lang}`, error)
    }
  }
}
