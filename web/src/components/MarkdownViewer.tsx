import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { useEffect, useState, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { OutlineItem } from '@/types'
import { getHighlighter, type Highlighter } from '@/lib/shiki'
import { isExternalUrl, resolveAgainstCurrentFile, looksLikeMarkdownPath } from '@/lib/markdownUtils'
import { MermaidDiagram } from '@/components/MermaidDiagram'
import { CodeHighlight } from '@/components/CodeHighlight'
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog'

interface MarkdownViewerProps {
  content: string
  currentFile?: string | null
  showSource?: boolean
  onNavigateToFile?: (path: string) => void
  onOutlineChange?: (outline: OutlineItem[]) => void
}

export function MarkdownViewer({ content, currentFile, showSource = false, onNavigateToFile, onOutlineChange }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null)
  const [displayContent, setDisplayContent] = useState(content)
  const [isContentTransitioning, setIsContentTransitioning] = useState(false)
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null)
  const [previewImageAlt, setPreviewImageAlt] = useState<string>('')

  const onOutlineChangeRef = useRef(onOutlineChange)
  onOutlineChangeRef.current = onOutlineChange

  useEffect(() => {
    getHighlighter().then(setHighlighter)
  }, [])

  // 文档切换淡入淡出，减少"闪切"感
  useEffect(() => {
    if (content === displayContent) return
    setIsContentTransitioning(true)
    const timer = window.setTimeout(() => {
      setDisplayContent(content)
      window.requestAnimationFrame(() => setIsContentTransitioning(false))
    }, 120)
    return () => window.clearTimeout(timer)
  }, [content, displayContent])

  // 从 DOM 中提取 outline
  useEffect(() => {
    if (!containerRef.current || !onOutlineChangeRef.current) return
    const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const outline: OutlineItem[] = Array.from(headings).map(heading => ({
      level: parseInt(heading.tagName.charAt(1)),
      text: heading.textContent || '',
      slug: heading.id || '',
    }))
    onOutlineChangeRef.current(outline)
  }, [displayContent])

  // 锚点平滑滚动
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (href?.startsWith('#')) {
        e.preventDefault()
        const el = document.getElementById(href.slice(1))
        el?.scrollIntoView({ behavior: 'smooth' })
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
      {showSource ? (
        <pre className="my-4 rounded-lg border border-border bg-muted/40 p-4 overflow-x-auto">
          <code className="text-sm font-mono text-foreground">{displayContent}</code>
        </pre>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
          components={{
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children }) => {
              const code = String(children).replace(/\n$/, '')
              const match = /language-([a-z0-9#+.-]+)/i.exec(className || '')
              const language = match ? match[1] : 'text'
              const isBlockCode = Boolean(match) || /\n/.test(code)

              if (!isBlockCode) {
                return <code className="inline-code">{children}</code>
              }

              if (language.toLowerCase() === 'mermaid') {
                return <MermaidDiagram code={code} />
              }

              if (highlighter) {
                return <CodeHighlight language={language} code={code} highlighter={highlighter} />
              }

              return (
                <pre className="my-4 rounded-lg border border-border bg-muted/40 p-4 overflow-x-auto">
                  <code className="text-sm font-mono text-foreground">{code}</code>
                </pre>
              )
            },
            a: ({ href, children, ...props }) => {
              const link = href || ''
              if (!link) return <a {...props}>{children}</a>
              if (link.startsWith('#') || isExternalUrl(link)) {
                return <a href={link} {...props}>{children}</a>
              }

              const [pathPart, hashPart] = link.split('#')
              const resolvedPath = resolveAgainstCurrentFile(pathPart, currentFile)

              if (!looksLikeMarkdownPath(pathPart)) {
                let assetHref = `/api/asset?path=${encodeURIComponent(pathPart)}`
                if (currentFile) assetHref += `&base=${encodeURIComponent(currentFile)}`
                if (hashPart) assetHref += `#${hashPart}`
                return <a href={assetHref} {...props}>{children}</a>
              }

              const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
                e.preventDefault()
                if (!resolvedPath || !onNavigateToFile) return
                onNavigateToFile(resolvedPath)
                if (hashPart) window.location.hash = hashPart
              }

              return (
                <a href={`?path=${encodeURIComponent(resolvedPath)}`} onClick={handleClick} {...props}>
                  {children}
                </a>
              )
            },
            img: ({ src, alt }) => {
              let imageSrc = src
              if (src && !isExternalUrl(src)) {
                imageSrc = `/api/asset?path=${encodeURIComponent(src)}`
                if (currentFile) imageSrc += `&base=${encodeURIComponent(currentFile)}`
              }
              return (
                <img
                  src={imageSrc}
                  alt={alt}
                  className="rounded-lg cursor-zoom-in"
                  onClick={() => {
                    if (!imageSrc) return
                    setPreviewImageSrc(imageSrc)
                    setPreviewImageAlt(alt || '')
                  }}
                />
              )
            },
          }}
        >
          {displayContent}
        </ReactMarkdown>
      )}
      <ImagePreviewDialog
        src={previewImageSrc}
        alt={previewImageAlt}
        onClose={() => setPreviewImageSrc(null)}
      />
    </div>
  )
}
