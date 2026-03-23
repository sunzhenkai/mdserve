import { useEffect, useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface ImagePreviewDialogProps {
  src: string | null
  alt?: string
  onClose: () => void
}

export function ImagePreviewDialog({ src, alt = '', onClose }: ImagePreviewDialogProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const fitScaleRef = useRef(1)

  const calcFitScale = useCallback((naturalW: number, naturalH: number) => {
    if (naturalW <= 0 || naturalH <= 0) return
    const pad = 96
    const fit = Math.min((window.innerWidth - pad) / naturalW, (window.innerHeight - pad) / naturalH, 1.5)
    fitScaleRef.current = fit
    setScale(fit)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    if (!src) { setScale(1); setOffset({ x: 0, y: 0 }) }
  }, [src])

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
    <Dialog open={Boolean(src)} onOpenChange={open => !open && onClose()}>
      <DialogContent
        hideClose
        className="!inset-0 !translate-x-0 !translate-y-0 w-screen max-w-none h-screen max-h-none rounded-none p-0 border-0 bg-background/20 backdrop-blur-2xl shadow-none"
        overlayClassName="bg-background/40 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">图片预览</DialogTitle>
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

          {/* 图片内容 */}
          {src && (
            <div className="h-full w-full flex items-center justify-center">
              <img
                src={src}
                alt={alt}
                className="max-w-none select-none rounded-lg shadow-lg"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center' }}
                draggable={false}
                onLoad={e => {
                  const img = e.currentTarget
                  calcFitScale(img.naturalWidth, img.naturalHeight)
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
