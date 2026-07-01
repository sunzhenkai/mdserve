import { useState } from 'react'
import { Copy, Check, Download, FileCode2, Maximize2, Minimize2 } from 'lucide-react'
import { copyTextToClipboard } from '@/lib/markdownUtils'

const btnClass =
  'p-1 rounded-md bg-background/70 backdrop-blur-sm border border-border/60 hover:bg-accent hover:text-accent-foreground opacity-60 hover:opacity-100 transition-opacity transition-colors cursor-pointer'

interface DocumentToolbarProps {
  content: string | null
  documentSourceVisible: boolean
  onToggleSource: () => void
  onDownload: () => void
  fullscreen?: boolean
  onToggleFullscreen: () => void
}

export function DocumentToolbar({
  content,
  documentSourceVisible,
  onToggleSource,
  onDownload,
  fullscreen = false,
  onToggleFullscreen,
}: DocumentToolbarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!content) return
    const didCopy = await copyTextToClipboard(content)
    if (!didCopy) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onToggleSource}
        className={btnClass}
        title={documentSourceVisible ? '查看渲染' : '查看源码'}
        aria-label={documentSourceVisible ? '查看渲染' : '查看源码'}
      >
        <FileCode2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={handleCopy}
        className={btnClass}
        title={copied ? '已复制源码' : '复制源码'}
        aria-label={copied ? '已复制源码' : '复制源码'}
        disabled={!content}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onDownload} className={btnClass} title="下载文档" aria-label="下载文档">
        <Download className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggleFullscreen}
        className={btnClass}
        title={fullscreen ? '退出全屏 (Esc)' : '全屏'}
        aria-label={fullscreen ? '退出全屏' : '全屏'}
      >
        {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
