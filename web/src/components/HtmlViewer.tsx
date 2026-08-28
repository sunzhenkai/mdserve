import DOMPurify from 'dompurify'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { OutlineItem } from '@/types'
import {
  buildAssetUrl,
  buildStandaloneHtmlUrl,
  contentRevision,
  extractBodyHtml,
  extractHtmlOutline,
  looksLikeStandaloneHtml,
  rewriteRelativeUrls,
  slugifyHeading,
} from '@/lib/htmlUtils'
import { setOutlineScrollHandler } from '@/lib/outlineNavigation'
import {
  isExternalUrl,
  looksLikeDocumentPath,
  resolveAgainstCurrentFile,
} from '@/lib/markdownUtils'
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog'

interface HtmlViewerProps {
  content: string
  currentFile?: string | null
  showSource?: boolean
  onNavigateToFile?: (path: string) => void
  onOutlineChange?: (outline: OutlineItem[]) => void
}

const PROSE_CLASS =
  'prose max-w-none prose-headings:scroll-mt-20 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-blockquote:text-muted-foreground prose-hr:border-border prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-th:text-foreground prose-td:text-foreground transition-all duration-200 ease-out'

const IFRAME_SANDBOX = 'allow-scripts allow-downloads allow-modals'

export function HtmlViewer({
  content,
  currentFile,
  showSource = false,
  onNavigateToFile,
  onOutlineChange,
}: HtmlViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [displayContent, setDisplayContent] = useState(content)
  const [isContentTransitioning, setIsContentTransitioning] = useState(false)
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null)
  const [previewImageAlt, setPreviewImageAlt] = useState('')

  const onOutlineChangeRef = useRef(onOutlineChange)
  onOutlineChangeRef.current = onOutlineChange

  const standalone = useMemo(
    () => Boolean(currentFile) && looksLikeStandaloneHtml(content),
    [content, currentFile]
  )
  const isolated = standalone && !showSource

  const assetUrl = useMemo(() => {
    if (!currentFile || !standalone) return ''
    return buildStandaloneHtmlUrl(currentFile, contentRevision(content))
  }, [currentFile, standalone, content])

  useEffect(() => {
    if (isolated) return
    if (content === displayContent) return
    setIsContentTransitioning(true)
    const timer = window.setTimeout(() => {
      setDisplayContent(content)
      window.requestAnimationFrame(() => setIsContentTransitioning(false))
    }, 120)
    return () => window.clearTimeout(timer)
  }, [content, displayContent, isolated])

  const sanitizedHtml = useMemo(() => {
    if (isolated || showSource) return ''
    const { bodyHtml, stylesheetHrefs } = extractBodyHtml(displayContent)
    const rewritten = rewriteRelativeUrls(bodyHtml, currentFile, stylesheetHrefs)
    return DOMPurify.sanitize(rewritten, {
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      ADD_TAGS: ['style'],
      ADD_ATTR: ['target', 'rel', 'data-doc-path'],
    })
  }, [isolated, showSource, displayContent, currentFile])

  useEffect(() => {
    if (!isolated || !onOutlineChangeRef.current) return
    onOutlineChangeRef.current(extractHtmlOutline(content))
  }, [isolated, content])

  useEffect(() => {
    if (!isolated || !assetUrl) {
      setOutlineScrollHandler(null)
      return
    }

    setOutlineScrollHandler((slug) => {
      const iframe = iframeRef.current
      if (!iframe) return false
      const next = `${assetUrl}#${encodeURIComponent(slug)}`
      if (iframe.getAttribute('src') === next) {
        iframe.src = assetUrl
        window.requestAnimationFrame(() => {
          iframe.src = next
        })
      } else {
        iframe.src = next
      }
      return true
    })

    return () => setOutlineScrollHandler(null)
  }, [isolated, assetUrl])

  useEffect(() => {
    if (!containerRef.current || !onOutlineChangeRef.current || showSource || isolated) return

    const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const usedSlugs = new Set<string>()
    const outline: OutlineItem[] = []

    headings.forEach(heading => {
      if (!heading.id) {
        let slug = slugifyHeading(heading.textContent || '')
        let unique = slug
        let i = 1
        while (usedSlugs.has(unique)) {
          unique = `${slug}-${i++}`
        }
        heading.id = unique
        usedSlugs.add(unique)
      } else {
        usedSlugs.add(heading.id)
      }

      outline.push({
        level: parseInt(heading.tagName.charAt(1), 10),
        text: heading.textContent || '',
        slug: heading.id,
      })
    })

    onOutlineChangeRef.current(outline)
  }, [sanitizedHtml, showSource, isolated])

  useEffect(() => {
    if (isolated) return
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (href?.startsWith('#')) {
        e.preventDefault()
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isolated])

  const handleContainerClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) {
      const img = (e.target as HTMLElement).closest('img')
      if (img instanceof HTMLImageElement && img.src) {
        setPreviewImageSrc(img.src)
        setPreviewImageAlt(img.alt || '')
      }
      return
    }

    const href = anchor.getAttribute('href') || ''
    if (!href || href.startsWith('#') || isExternalUrl(href)) return

    const [pathPart, hashPart] = href.split('#')
    const docPath = anchor.getAttribute('data-doc-path') || resolveAgainstCurrentFile(pathPart, currentFile)

    if (looksLikeDocumentPath(pathPart)) {
      e.preventDefault()
      if (!docPath || !onNavigateToFile) return
      onNavigateToFile(docPath)
      if (hashPart) {
        window.setTimeout(() => {
          document.getElementById(hashPart)?.scrollIntoView({ behavior: 'smooth' })
        }, 150)
      }
      return
    }

    e.preventDefault()
    window.location.href = buildAssetUrl(pathPart, currentFile) + (hashPart ? `#${hashPart}` : '')
  }

  if (isolated && assetUrl) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <iframe
          ref={iframeRef}
          key={assetUrl}
          src={assetUrl}
          title={currentFile?.split('/').pop() || 'HTML'}
          className="block min-h-0 w-full flex-1 border-0 bg-background"
          sandbox={IFRAME_SANDBOX}
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${PROSE_CLASS} ${isContentTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
      onClick={handleContainerClick}
    >
      {showSource ? (
        <pre className="my-4 rounded-lg border border-border bg-muted/40 p-4 overflow-x-auto">
          <code className="text-sm font-mono text-foreground">{content}</code>
        </pre>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
      )}
      <ImagePreviewDialog
        src={previewImageSrc}
        alt={previewImageAlt}
        onClose={() => setPreviewImageSrc(null)}
      />
    </div>
  )
}
