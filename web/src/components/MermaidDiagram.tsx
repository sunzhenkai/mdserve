import { useEffect, useState, useId } from 'react'
import { Copy, Check, Download, FileCode2, ImageIcon } from 'lucide-react'
import mermaid from 'mermaid'
import { Button } from '@/components/ui/button'
import { copyTextToClipboard } from '@/lib/markdownUtils'

function MermaidToolbar({
  showSource,
  copied,
  onToggleSource,
  onCopy,
  onDownload,
}: {
  showSource: boolean
  copied: boolean
  onToggleSource: () => void
  onCopy: () => void
  onDownload?: () => void
}) {
  const btnClass =
    'h-8 w-8 bg-background/70 backdrop-blur-sm border border-border/70 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity'
  return (
    <div className="mermaid-toolbar">
      <Button
        variant="ghost"
        size="icon"
        className={btnClass}
        onClick={onToggleSource}
        aria-label={showSource ? '查看图形' : '查看源码'}
        title={showSource ? '查看图形' : '查看源码'}
      >
        {showSource ? <ImageIcon className="h-4 w-4" /> : <FileCode2 className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={btnClass}
        onClick={onCopy}
        aria-label={copied ? '已复制源码' : '复制源码'}
        title={copied ? '已复制源码' : '复制源码'}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      {onDownload && (
        <Button
          variant="ghost"
          size="icon"
          className={btnClass}
          onClick={onDownload}
          aria-label="下载 SVG"
          title="下载 SVG"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)
  const componentId = useId()

  useEffect(() => {
    let cancelled = false

    const renderDiagram = async () => {
      setIsRendering(true)
      setError(null)

      try {
        const isDarkTheme = document.documentElement.classList.contains('dark')
        const renderId = `mermaid-${componentId.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}`

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDarkTheme ? 'dark' : 'default',
        })

        const { svg: renderedSvg } = await mermaid.render(renderId, code)
        if (!cancelled) setSvg(renderedSvg)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '渲染 Mermaid 图表失败')
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    }

    renderDiagram()
    return () => { cancelled = true }
  }, [code, componentId])

  const handleCopySource = async () => {
    const didCopy = await copyTextToClipboard(code)
    if (!didCopy) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadSvg = () => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mermaid-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const sourceBlock = (
    <pre className="my-3 rounded-md border border-border bg-muted/40 p-3 overflow-x-auto">
      <code className="text-sm font-mono text-foreground">{code}</code>
    </pre>
  )

  if (isRendering) {
    return (
      <div className="mermaid-container group">
        <div className="mermaid-placeholder">正在渲染 Mermaid 图表...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mermaid-container group">
        <MermaidToolbar
          showSource={showSource}
          copied={copied}
          onToggleSource={() => setShowSource(p => !p)}
          onCopy={handleCopySource}
        />
        <div className="mermaid-error">Mermaid 渲染失败：{error}</div>
        {sourceBlock}
      </div>
    )
  }

  return (
    <div className="mermaid-container group">
      <MermaidToolbar
        showSource={showSource}
        copied={copied}
        onToggleSource={() => setShowSource(p => !p)}
        onCopy={handleCopySource}
        onDownload={handleDownloadSvg}
      />
      {showSource ? sourceBlock : (
        <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  )
}
