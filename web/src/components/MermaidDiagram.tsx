import { useEffect, useState, useId, useRef } from 'react'
import { Copy, Check, Download, FileCode2, ImageIcon, Maximize2, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react'
import mermaid from 'mermaid'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { copyTextToClipboard } from '@/lib/markdownUtils'

function MermaidToolbar({
  showSource,
  copied,
  onToggleSource,
  onCopy,
  onDownload,
  onPreview,
}: {
  showSource: boolean
  copied: boolean
  onToggleSource: () => void
  onCopy: () => void
  onDownload?: () => void
  onPreview?: () => void
}) {
  const btnClass =
    'h-8 w-8 bg-background/70 backdrop-blur-sm border border-border/70 opacity-40 hover:opacity-100 transition-opacity'
  return (
    <div className="mermaid-toolbar">
      {onPreview && (
        <Button
          variant="ghost"
          size="icon"
          className={btnClass}
          onClick={onPreview}
          aria-label="全屏预览"
          title="全屏预览"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
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

function MermaidPreviewDialog({ svg, onClose }: { svg: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const fitScaleRef = useRef(1)

  // 打开时自动计算 fit-to-screen 缩放
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const pad = 96
    const vw = window.innerWidth - pad
    const vh = window.innerHeight - pad
    const w = el.scrollWidth
    const h = el.scrollHeight
    if (w > 0 && h > 0) {
      const fit = Math.min(vw / w, vh / h, 1.5)
      fitScaleRef.current = fit
      setScale(fit)
    }
  }, [svg])

  const zoomIn = () => setScale(prev => Math.min(5, Number((prev + 0.25).toFixed(2))))
  const zoomOut = () => setScale(prev => Math.max(0.2, Number((prev - 0.25).toFixed(2))))
  const resetZoom = () => { setScale(fitScaleRef.current); setOffset({ x: 0, y: 0 }) }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.15 : -0.15
    setScale(prev => Math.min(5, Math.max(0.2, Number((prev + delta).toFixed(2)))))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    setOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        hideClose
        className="!inset-0 !translate-x-0 !translate-y-0 w-screen max-w-none h-screen max-h-none rounded-none p-0 border-0 bg-card/70 backdrop-blur-2xl shadow-none"
        overlayClassName="bg-background/40 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Mermaid 图表预览</DialogTitle>
        <div
          className={`relative h-full w-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 工具栏 */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={zoomOut} title="缩小">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={zoomIn} title="放大">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={resetZoom} title="重置">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={onClose} title="关闭">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute left-3 top-3 z-20 rounded-md bg-background/60 backdrop-blur-sm px-2 py-1 text-xs text-foreground border border-border/50" onMouseDown={e => e.stopPropagation()}>
            {Math.round(scale * 100)}%
          </div>

          {/* SVG 内容 */}
          <div className="h-full w-full flex items-center justify-center">
            <div
              ref={contentRef}
              className="select-none rounded-xl bg-card p-6 shadow-lg [&_svg]:block [&_svg]:max-w-none [&_svg]:h-auto"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
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
        onPreview={() => setIsPreviewOpen(true)}
      />
      {showSource ? sourceBlock : (
        <div
          className="mermaid-diagram cursor-zoom-in"
          dangerouslySetInnerHTML={{ __html: svg }}
          onClick={() => setIsPreviewOpen(true)}
        />
      )}
      {isPreviewOpen && (
        <MermaidPreviewDialog svg={svg} onClose={() => setIsPreviewOpen(false)} />
      )}
    </div>
  )
}
