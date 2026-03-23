import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { useEffect, useState, useRef, useMemo, useId, type MouseEvent as ReactMouseEvent } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutlineItem } from '@/types'
import { getHighlighter, loadLanguageIfNeeded, type Highlighter } from '@/lib/shiki'

interface MarkdownViewerProps {
  content: string
  currentFile?: string | null
  onNavigateToFile?: (path: string) => void
  onOutlineChange?: (outline: OutlineItem[]) => void
}

function isExternalUrl(href: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(href) || /^(mailto:|tel:|data:)/i.test(href)
}

function normalizeDocPath(path: string): string {
  const segments = path.replace(/\\/g, '/').split('/')
  const stack: string[] = []
  for (const segment of segments) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (stack.length > 0) stack.pop()
      continue
    }
    stack.push(segment)
  }
  return stack.join('/')
}

function dirname(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(0, idx) : ''
}

function resolveAgainstCurrentFile(targetPath: string, currentFile?: string | null): string {
  const raw = targetPath.replace(/\\/g, '/')
  if (raw.startsWith('/')) {
    return normalizeDocPath(raw.slice(1))
  }
  const baseDir = currentFile ? dirname(currentFile) : ''
  return normalizeDocPath(baseDir ? `${baseDir}/${raw}` : raw)
}

function looksLikeMarkdownPath(path: string): boolean {
  const withoutQuery = path.split('?')[0]
  const fileName = withoutQuery.split('/').pop() || ''
  if (!fileName) return true
  if (!fileName.includes('.')) return true
  return /\.mdx?$/i.test(fileName)
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(true)
  const componentId = useId()

  useEffect(() => {
    let cancelled = false

    const renderDiagram = async () => {
      setIsRendering(true)
      setError(null)

      try {
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default
        const isDarkTheme = document.documentElement.classList.contains('dark')
        const renderId = `mermaid-${componentId.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}`

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDarkTheme ? 'dark' : 'default',
        })

        const { svg: renderedSvg } = await mermaid.render(renderId, code)
        if (!cancelled) {
          setSvg(renderedSvg)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '渲染 Mermaid 图表失败')
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false)
        }
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
    }
  }, [code, componentId])

  if (isRendering) {
    return (
      <div className="mermaid-container">
        <div className="mermaid-placeholder">正在渲染 Mermaid 图表...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mermaid-container">
        <div className="mermaid-error">Mermaid 渲染失败：{error}</div>
        <pre className="my-3 rounded-md border border-border bg-muted/40 p-3 overflow-x-auto">
          <code className="text-sm font-mono text-foreground">{code}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className="mermaid-container">
      <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

// 代码块高亮组件
function CodeHighlight({ 
  language, 
  code, 
  highlighter 
}: { 
  language: string
  code: string
  highlighter: Highlighter 
}) {
  const [copied, setCopied] = useState(false)
  const [resolvedLanguage, setResolvedLanguage] = useState<string>('text')
  const containerRef = useRef<HTMLDivElement>(null)
  
  const handleCopy = async () => {
    if (containerRef.current) {
      const text = containerRef.current.textContent || ''
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = text
          textarea.style.position = 'fixed'
          textarea.style.left = '-9999px'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
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

    return () => {
      cancelled = true
    }
  }, [highlighter, language])

  // 使用 shiki 进行高亮
  const html = useMemo(() => {
    try {
      return highlighter.codeToHtml(code, {
        lang: resolvedLanguage,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
        defaultColor: false,
      })
    } catch (error) {
      console.warn('Failed to highlight code:', error)
      // 降级处理：返回纯文本
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

export function MarkdownViewer({ content, currentFile, onNavigateToFile, onOutlineChange }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null)
  const [displayContent, setDisplayContent] = useState(content)
  const [isContentTransitioning, setIsContentTransitioning] = useState(false)
  
  // 使用 ref 存储 onOutlineChange，避免作为 useEffect 依赖
  const onOutlineChangeRef = useRef(onOutlineChange)
  onOutlineChangeRef.current = onOutlineChange

  // 初始化 highlighter
  useEffect(() => {
    getHighlighter().then(setHighlighter)
  }, [])

  // 文档切换时做轻量淡入淡出，减少“闪切”感
  useEffect(() => {
    if (content === displayContent) return

    setIsContentTransitioning(true)
    const timer = window.setTimeout(() => {
      setDisplayContent(content)
      window.requestAnimationFrame(() => {
        setIsContentTransitioning(false)
      })
    }, 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [content, displayContent])

  // 从 DOM 中提取实际的 outline（使用 rehype-slug 生成的 id）
  useEffect(() => {
    if (containerRef.current && onOutlineChangeRef.current) {
      const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const outline: OutlineItem[] = Array.from(headings).map(heading => {
        const level = parseInt(heading.tagName.charAt(1))
        const text = heading.textContent || ''
        const slug = heading.id || ''
        return { level, text, slug }
      })
      onOutlineChangeRef.current(outline)
    }
  }, [displayContent]) // 只依赖渲染中的内容，不依赖 onOutlineChange

  // 处理锚点点击，实现平滑滚动
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (href?.startsWith('#')) {
        e.preventDefault()
        const id = href.slice(1)
        if (id) {
          const element = document.getElementById(id)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`prose max-w-none prose-headings:scroll-mt-20 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-blockquote:text-muted-foreground prose-hr:border-border prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-th:text-foreground prose-td:text-foreground transition-all duration-200 ease-out ${isContentTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          // 代码块处理
          pre: ({ children }) => {
            // 直接返回 children，因为我们会在 code 组件中处理
            return <>{children}</>
          },
          code: ({ className, children, ...props }) => {
            const code = String(children).replace(/\n$/, '')
            const match = /language-([a-z0-9#+.-]+)/i.exec(className || '')
            const language = match ? match[1] : 'text'
            const isBlockCode = Boolean(match) || /\n/.test(code)

            // 即便没有显式语言标记，fenced code 也应按块级展示
            if (isBlockCode) {
              if (language.toLowerCase() === 'mermaid') {
                return <MermaidDiagram code={code} />
              }
              if (highlighter) {
                return (
                  <CodeHighlight
                    language={language}
                    code={code}
                    highlighter={highlighter}
                  />
                )
              }
              // highlighter 未就绪时优雅降级，避免白色占位骨架
              return (
                <pre className="my-4 rounded-lg border border-border bg-muted/40 p-4 overflow-x-auto">
                  <code className="text-sm font-mono text-foreground">{code}</code>
                </pre>
              )
            }

            // 行内代码
            return (
              <code className="inline-code" {...props}>
                {children}
              </code>
            )
          },
          a: ({ href, children, ...props }) => {
            const link = href || ''
            if (!link) {
              return <a {...props}>{children}</a>
            }
            if (link.startsWith('#') || isExternalUrl(link)) {
              return (
                <a href={link} {...props}>
                  {children}
                </a>
              )
            }

            const [pathPart, hashPart] = link.split('#')
            const resolvedPath = resolveAgainstCurrentFile(pathPart, currentFile)
            const isMarkdownLink = looksLikeMarkdownPath(pathPart)

            if (!isMarkdownLink) {
              let assetHref = `/api/asset?path=${encodeURIComponent(pathPart)}`
              if (currentFile) {
                assetHref += `&base=${encodeURIComponent(currentFile)}`
              }
              if (hashPart) {
                assetHref += `#${hashPart}`
              }
              return (
                <a href={assetHref} {...props}>
                  {children}
                </a>
              )
            }

            const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
              e.preventDefault()
              if (!resolvedPath || !onNavigateToFile) return
              onNavigateToFile(resolvedPath)
              if (hashPart) {
                window.location.hash = hashPart
              }
            }

            return (
              <a href={`?path=${encodeURIComponent(resolvedPath)}`} onClick={handleClick} {...props}>
                {children}
              </a>
            )
          },
          // 处理图片
          img: ({ src, alt }) => {
            let imageSrc = src
            if (src && !isExternalUrl(src)) {
              imageSrc = `/api/asset?path=${encodeURIComponent(src)}`
              if (currentFile) {
                imageSrc += `&base=${encodeURIComponent(currentFile)}`
              }
            }
            return <img src={imageSrc} alt={alt} className="rounded-lg" />
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  )
}
