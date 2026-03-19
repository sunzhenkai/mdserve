import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { useEffect, useState, useRef, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutlineItem } from '@/types'
import { getHighlighter, type Highlighter } from '@/lib/shiki'

interface MarkdownViewerProps {
  content: string
  onOutlineChange?: (outline: OutlineItem[]) => void
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

  // 使用 shiki 进行高亮
  const html = useMemo(() => {
    try {
      // 检查语言是否支持
      const loadedLangs = highlighter.getLoadedLanguages()
      const lang = loadedLangs.includes(language) ? language : 'text'
      
      return highlighter.codeToHtml(code, {
        lang,
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
  }, [code, language, highlighter])

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

export function MarkdownViewer({ content, onOutlineChange }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null)
  
  // 使用 ref 存储 onOutlineChange，避免作为 useEffect 依赖
  const onOutlineChangeRef = useRef(onOutlineChange)
  onOutlineChangeRef.current = onOutlineChange

  // 初始化 highlighter
  useEffect(() => {
    getHighlighter().then(setHighlighter)
  }, [])

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
  }, [content]) // 只依赖 content，不依赖 onOutlineChange

  // 处理锚点点击，实现平滑滚动
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault()
        const id = target.getAttribute('href')?.slice(1)
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
    <div ref={containerRef} className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20">
      {highlighter ? (
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
                return (
                  <CodeHighlight 
                    language={language} 
                    code={code} 
                    highlighter={highlighter}
                  />
                )
              }
              
              // 行内代码
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              )
            },
            // 处理图片
            img: ({ src, alt }) => {
              // 如果是相对路径，转换为 API 请求
              if (src && !src.startsWith('http') && !src.startsWith('/')) {
                src = `/api/asset?path=${encodeURIComponent(src)}`
              }
              return <img src={src} alt={alt} className="rounded-lg" />
            },
          }}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      )}
    </div>
  )
}
