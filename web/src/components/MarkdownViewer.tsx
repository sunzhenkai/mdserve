import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import { useEffect, useState, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutlineItem } from '@/types'
import { getHighlighter } from '@/lib/shiki'

interface MarkdownViewerProps {
  content: string
  onOutlineChange?: (outline: OutlineItem[]) => void
}

// 代码块包装组件，带复制按钮
function CodeBlock({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  
  const handleCopy = async () => {
    if (preRef.current) {
      const code = preRef.current.textContent || ''
      try {
        // 优先使用 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code)
        } else {
          // Fallback: 使用 execCommand
          const textarea = document.createElement('textarea')
          textarea.value = code
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
  
  return (
    <div className="relative group my-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleCopy}
        title={copied ? '已复制' : '复制代码'}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre 
        ref={preRef} 
        className="!p-4 !m-0 rounded-lg overflow-x-auto bg-[#f6f8fa] dark:bg-[#161b22] shiki" 
        {...props}
      >
        {children}
      </pre>
    </div>
  )
}

export function MarkdownViewer({ content, onOutlineChange }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 使用 ref 存储 onOutlineChange，避免作为 useEffect 依赖
  const onOutlineChangeRef = useRef(onOutlineChange)
  onOutlineChangeRef.current = onOutlineChange

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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeShiki, {
            getHighlighter,
            themes: {
              light: 'github-light',
              dark: 'github-dark',
            },
            defaultColor: false, // 使用 CSS 变量，支持主题切换
          }]
        ]}
        components={{
          // 为代码块添加复制按钮
          pre: ({ children }) => {
            return <CodeBlock>{children}</CodeBlock>
          },
          // 修复行内代码显示问题：明确区分行内代码和代码块
          code: ({ className, children, ...props }) => {
            // 如果有 className（通常是 language-xxx），说明是代码块
            const isCodeBlock = className && /language-/.test(className)
            
            if (isCodeBlock) {
              // 代码块由 Shiki 处理，直接渲染
              return <code className={className} {...props}>{children}</code>
            }
            
            // 行内代码：添加特定样式类
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
    </div>
  )
}
