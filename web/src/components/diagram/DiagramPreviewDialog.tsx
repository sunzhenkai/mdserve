import { useEffect, useState, useRef } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface DiagramPreviewDialogProps {
  svg: string
  /** Title used for accessibility (includes the engine name). */
  title: string
  onClose: () => void
}

/**
 * Fullscreen, zoomable / pannable preview dialog. Behavior mirrors the
 * previous Mermaid-only preview exactly (zoom buttons, wheel zoom, drag-pan,
 * fit-to-screen on open) so it works for every engine.
 */
export function DiagramPreviewDialog({ svg, title, onClose }: DiagramPreviewDialogProps) {
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
        <DialogTitle className="sr-only">{title}</DialogTitle>
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
