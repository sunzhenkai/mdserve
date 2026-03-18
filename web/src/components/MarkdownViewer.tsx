import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import { useEffect } from 'react'
import 'highlight.js/styles/github-dark.css'

interface MarkdownViewerProps {
  content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
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
    <div className="markdown-viewer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        components={{
          // 为代码块添加复制按钮（简化版）
          pre: ({ children }) => {
            return <pre className="code-block">{children}</pre>
          },
          // 处理图片
          img: ({ src, alt }) => {
            // 如果是相对路径，转换为 API 请求
            if (src && !src.startsWith('http') && !src.startsWith('/')) {
              src = `/api/asset?path=${encodeURIComponent(src)}`
            }
            return <img src={src} alt={alt} />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
