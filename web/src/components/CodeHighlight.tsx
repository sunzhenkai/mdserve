import { useState, useRef, useEffect, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getHighlighter, loadLanguageIfNeeded, type Highlighter } from '@/lib/shiki'
import { copyTextToClipboard } from '@/lib/markdownUtils'

export { getHighlighter, type Highlighter }

export function CodeHighlight({
  language,
  code,
  highlighter,
}: {
  language: string
  code: string
  highlighter: Highlighter
}) {
  const [copied, setCopied] = useState(false)
  const [resolvedLanguage, setResolvedLanguage] = useState<string>('text')
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    if (!containerRef.current) return
    const text = containerRef.current.textContent || ''
    const didCopy = await copyTextToClipboard(text)
    if (!didCopy) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    let cancelled = false

    const ensureLanguage = async () => {
      await loadLanguageIfNeeded(highlighter, language)
      if (!cancelled) {
        const loadedLangs = highlighter.getLoadedLanguages()
        setResolvedLanguage(loadedLangs.includes(language) ? language : 'text')
      }
    }

    ensureLanguage()
    return () => { cancelled = true }
  }, [highlighter, language])

  const html = useMemo(() => {
    try {
      return highlighter.codeToHtml(code, {
        lang: resolvedLanguage,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      })
    } catch (error) {
      console.warn('Failed to highlight code:', error)
      return `<pre class="shiki"><code>${code}</code></pre>`
    }
  }, [code, resolvedLanguage, highlighter])

  return (
    <div className="relative group my-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 bg-background/70 backdrop-blur-sm"
        onClick={handleCopy}
        title={copied ? '已复制' : '复制代码'}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <div
        ref={containerRef}
        className="[&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:rounded-lg [&_pre]:overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
