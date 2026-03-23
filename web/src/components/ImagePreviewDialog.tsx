import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!src) setScale(1)
  }, [src])

  const zoomIn = () => setScale(prev => Math.min(5, Number((prev + 0.2).toFixed(2))))
  const zoomOut = () => setScale(prev => Math.max(0.2, Number((prev - 0.2).toFixed(2))))
  const resetZoom = () => setScale(1)

  return (
    <Dialog open={Boolean(src)} onOpenChange={open => !open && onClose()}>
      <DialogContent
        hideClose
        className="w-[96vw] max-w-[96vw] h-[92vh] max-h-[92vh] p-0 border-0 bg-black/90 shadow-none"
        overlayClassName="bg-black/80 backdrop-blur-sm"
      >
        <DialogTitle className="sr-only">图片预览</DialogTitle>
        <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={zoomOut} title="缩小">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={zoomIn} title="放大">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={resetZoom} title="重置缩放">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={onClose} title="关闭预览">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute left-3 top-3 z-20 rounded bg-black/55 px-2 py-1 text-xs text-white">
            缩放：{Math.round(scale * 100)}%
          </div>
          {src && (
            <div className="h-full w-full overflow-auto flex items-center justify-center p-6">
              <img
                src={src}
                alt={alt}
                className="max-w-none select-none"
                style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                onWheel={e => {
                  e.preventDefault()
                  e.deltaY < 0 ? zoomIn() : zoomOut()
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
