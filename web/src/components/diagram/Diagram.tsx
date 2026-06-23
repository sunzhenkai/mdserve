import { useEffect, useState, useId } from 'react'
import { Copy, Check, Download, FileCode2, ImageIcon, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyTextToClipboard } from '@/lib/markdownUtils'
import type { DiagramRenderer, DiagramError } from '@/lib/diagram/types'
import { DiagramPreviewDialog } from './DiagramPreviewDialog'
import { DiagramErrorState, DiagramUnavailableState } from './DiagramErrorState'

interface DiagramProps {
  code: string
  renderer: DiagramRenderer
}

function DiagramToolbar({
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
    <div className="diagram-toolbar">
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

/**
 * Generic diagram shell. Owns all engine-agnostic UX:
 * - loading / error / unavailable states
 * - toolbar (source toggle, copy, download, fullscreen preview)
 * - PreviewDialog (zoom / pan / reset)
 *
 * The actual rendering is delegated to the injected `renderer`, so adding a
 * new engine = implementing `DiagramRenderer`.
 */
export function Diagram({ code, renderer }: DiagramProps) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<DiagramError | null>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const componentId = useId()

  // Not-available path: show hint without calling render. Kept out of the
  // render effect so we never hit the network for a known-unavailable engine.
  const unavailableHint = !renderer.isAvailable() ? renderer.getUnavailableHint?.() : undefined

  useEffect(() => {
    // If the renderer isn't available there's nothing to render.
    if (!renderer.isAvailable()) {
      setIsRendering(false)
      setSvg('')
      setError(null)
      return
    }

    let cancelled = false
    const run = async () => {
      setIsRendering(true)
      setError(null)
      try {
        const out = await renderer.render(code)
        if (!cancelled) setSvg(out)
      } catch (err) {
        if (!cancelled) setError(err as DiagramError)
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    }
    run()
    return () => { cancelled = true }
    // renderer identity is stable per (engine, kroki config); code is the
    // primary driver. componentId keeps eslint happy without changing behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, renderer.engine, renderer.isAvailable(), componentId])

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
    link.download = `${renderer.engine}-${Date.now()}.svg`
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

  // Unavailable (e.g. Kroki not configured): show hint, keep toolbar for source/copy.
  if (unavailableHint) {
    return (
      <div className="diagram-container group">
        <DiagramToolbar
          showSource={showSource}
          copied={copied}
          onToggleSource={() => setShowSource(p => !p)}
          onCopy={handleCopySource}
        />
        {showSource ? sourceBlock : <DiagramUnavailableState hint={unavailableHint} engine={renderer.engine} code={code} />}
      </div>
    )
  }

  if (isRendering) {
    return (
      <div className="diagram-container group">
        <div className="diagram-placeholder">正在渲染 {renderer.engine} 图表...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="diagram-container group">
        <DiagramToolbar
          showSource={showSource}
          copied={copied}
          onToggleSource={() => setShowSource(p => !p)}
          onCopy={handleCopySource}
        />
        {showSource ? sourceBlock : <DiagramErrorState error={error} code={code} />}
      </div>
    )
  }

  return (
    <div className="diagram-container group">
      <DiagramToolbar
        showSource={showSource}
        copied={copied}
        onToggleSource={() => setShowSource(p => !p)}
        onCopy={handleCopySource}
        onDownload={handleDownloadSvg}
        onPreview={() => setIsPreviewOpen(true)}
      />
      {showSource ? sourceBlock : (
        <div
          className="diagram-figure cursor-zoom-in"
          dangerouslySetInnerHTML={{ __html: svg }}
          onClick={() => setIsPreviewOpen(true)}
        />
      )}
      {isPreviewOpen && (
        <DiagramPreviewDialog
          svg={svg}
          title={`${renderer.engine} 图表预览`}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  )
}
