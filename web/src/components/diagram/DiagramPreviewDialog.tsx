import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  calculateDiagramFitScale,
  clampDiagramPreviewScale,
  type DiagramPreviewSize,
} from '@/lib/diagram/previewScale'
import { ensureSvgVisibleSize, measureDiagramSvg } from '@/lib/diagram/svgMeasure'

interface DiagramPreviewDialogProps {
  svg: string
  /** Title used for accessibility (includes the engine name). */
  title: string
  /**
   * Mermaid SVG embeds labels via `<foreignObject>`, which browsers refuse to
   * paint inside `<img>` blob URLs. Kroki SVGs are plain vector markup and
   * render reliably as blob-backed images (including viewBox-only d2 output).
   */
  embedMode?: 'inline' | 'img'
  onClose: () => void
}

const BUTTON_ZOOM_STEP = 0.25
const WHEEL_ZOOM_STEP = 0.15

function roundScale(scale: number): number {
  return Number(scale.toFixed(2))
}

/**
 * Fullscreen, zoomable / pannable preview dialog for every diagram engine.
 * Fit and zoom bounds are based on the actual preview viewport so small SVGs
 * are displayed readably and can continue scaling beyond their intrinsic size.
 */
export function DiagramPreviewDialog({
  svg,
  title,
  embedMode = 'img',
  onClose,
}: DiagramPreviewDialogProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [svgUrl, setSvgUrl] = useState('')
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const diagramSizeRef = useRef<DiagramPreviewSize | null>(null)
  const fitScaleRef = useRef(1)
  const isAtFitRef = useRef(true)

  useEffect(() => {
    if (embedMode !== 'img') {
      setSvgUrl('')
      return
    }
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    setSvgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [svg, embedMode])

  useLayoutEffect(() => {
    diagramSizeRef.current = null
    fitScaleRef.current = 1
    isAtFitRef.current = true
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [svg, embedMode])

  const recalculateFitScale = useCallback((resetView: boolean) => {
    const viewport = viewportRef.current
    const diagramSize = diagramSizeRef.current
    if (!viewport || !diagramSize) return

    const fitScale = calculateDiagramFitScale(
      { width: viewport.clientWidth, height: viewport.clientHeight },
      diagramSize,
    )
    if (fitScale === null) return

    fitScaleRef.current = fitScale
    const shouldResetView = resetView || isAtFitRef.current
    setScale(previousScale => {
      const nextScale = shouldResetView
        ? fitScale
        : clampDiagramPreviewScale(previousScale, fitScale)
      return roundScale(nextScale)
    })

    if (shouldResetView) {
      isAtFitRef.current = true
      setOffset({ x: 0, y: 0 })
    }
  }, [])

  const setDiagramSize = useCallback((size: DiagramPreviewSize) => {
    if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
      return
    }
    const isInitialMeasurement = diagramSizeRef.current === null
    diagramSizeRef.current = size
    recalculateFitScale(isInitialMeasurement)
  }, [recalculateFitScale])

  // Inline SVG (Mermaid): measure DOM after paint; img mode uses onLoad instead.
  useLayoutEffect(() => {
    if (embedMode !== 'inline') return
    const element = contentRef.current
    if (!element) return

    const measureAndFit = () => {
      const size = measureDiagramSvg(element)
      if (size.w <= 0 || size.h <= 0) return
      ensureSvgVisibleSize(element, size)
      setDiagramSize({ width: size.w, height: size.h })
    }

    measureAndFit()
    const frameId = requestAnimationFrame(measureAndFit)
    return () => cancelAnimationFrame(frameId)
  }, [svg, embedMode, setDiagramSize])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new ResizeObserver(() => recalculateFitScale(false))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [recalculateFitScale])

  const changeScale = useCallback((delta: number) => {
    isAtFitRef.current = false
    setScale(previousScale => roundScale(clampDiagramPreviewScale(
      previousScale + delta,
      fitScaleRef.current,
    )))
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      changeScale(event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP)
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [changeScale])

  const zoomIn = () => changeScale(BUTTON_ZOOM_STEP)
  const zoomOut = () => changeScale(-BUTTON_ZOOM_STEP)
  const resetZoom = () => {
    isAtFitRef.current = true
    setScale(roundScale(fitScaleRef.current))
    setOffset({ x: 0, y: 0 })
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const nextOffset = { x: event.clientX - dragStartRef.current.x, y: event.clientY - dragStartRef.current.y }
    if (nextOffset.x !== offset.x || nextOffset.y !== offset.y) {
      isAtFitRef.current = false
    }
    setOffset(nextOffset)
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  const transformStyle = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    transformOrigin: 'center center',
  } as const

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        hideClose
        className="!z-[70] !inset-0 !translate-x-0 !translate-y-0 w-screen max-w-none h-screen max-h-none rounded-none p-0 border-0 bg-card/70 backdrop-blur-2xl shadow-none"
        overlayClassName="bg-background/40 backdrop-blur-md !z-[70]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          使用鼠标滚轮或工具栏按钮缩放图表，拖拽可平移预览区域。
        </DialogDescription>
        <div
          ref={viewportRef}
          className={`relative h-full w-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2" onMouseDown={event => event.stopPropagation()}>
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
          <div className="absolute left-3 top-3 z-20 rounded-md bg-background/60 backdrop-blur-sm px-2 py-1 text-xs text-foreground border border-border/50" onMouseDown={event => event.stopPropagation()}>
            {Math.round(scale * 100)}%
          </div>

          <div className="h-full w-full flex items-center justify-center">
            {embedMode === 'inline' ? (
              <div
                ref={contentRef}
                className="select-none rounded-xl bg-card shadow-lg [&>svg]:block [&>svg]:max-w-none [&>svg]:h-auto"
                style={transformStyle}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              svgUrl && (
                <img
                  src={svgUrl}
                  alt={title}
                  className="max-w-none select-none rounded-xl bg-card shadow-lg"
                  style={transformStyle}
                  draggable={false}
                  onLoad={event => {
                    const image = event.currentTarget
                    setDiagramSize({ width: image.naturalWidth, height: image.naturalHeight })
                  }}
                />
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
