import type React from 'react'
import { DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ModalShellProps {
  children: React.ReactNode
  className?: string
  overlayClassName?: string
  hideClose?: boolean
}

// 通用弹窗外观骨架：统一宽高、圆角、阴影、遮罩与布局容器（flex-col）。
export function ModalShell({
  children,
  className,
  overlayClassName,
  hideClose,
}: ModalShellProps) {
  return (
    <DialogContent
      hideClose={hideClose}
      overlayClassName={overlayClassName ?? 'bg-black/40 backdrop-blur-sm'}
      className={cn(
        'sm:max-w-2xl w-[90vw] max-h-[70vh] p-0 gap-0 overflow-hidden shadow-2xl flex flex-col bg-background rounded-xl',
        className
      )}
    >
      {children}
    </DialogContent>
  )
}

