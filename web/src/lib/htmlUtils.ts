import { isExternalUrl, resolveAgainstCurrentFile } from '@/lib/markdownUtils'
import type { OutlineItem } from '@/types'

/** 可执行内联脚本合计超过该长度时，视为需要原页运行的独立 HTML。 */
export const STANDALONE_INLINE_SCRIPT_CHARS = 1500

export function looksLikeStandaloneHtml(raw: string): boolean {
  if (!raw) return false
  if (/<html\b[^>]*\sdata-[\w-]+\s*=/i.test(raw)) return true

  const withoutDataScripts = raw.replace(
    /<script\b[^>]*type\s*=\s*["']application\/(?:ld\+)?json["'][^>]*>[\s\S]*?<\/script>/gi,
    ''
  )
  if (/<script\b[^>]*\bsrc\s*=/i.test(withoutDataScripts)) return true

  const inline = withoutDataScripts.match(/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/gi)
  if (!inline) return false

  let length = 0
  for (const block of inline) {
    length += block.length
    if (length > STANDALONE_INLINE_SCRIPT_CHARS) return true
  }
  return false
}

export function contentRevision(content: string): string {
  let hash = 2166136261
  const len = content.length
  const step = Math.max(1, Math.floor(len / 4096))
  for (let i = 0; i < len; i += step) {
    hash ^= content.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  hash ^= len
  return `${(hash >>> 0).toString(36)}-${len}`
}

export function buildStandaloneHtmlUrl(filePath: string, revision: string): string {
  return `/api/asset?path=${encodeURIComponent(filePath)}&v=${encodeURIComponent(revision)}`
}

export function extractHtmlOutline(raw: string): OutlineItem[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, 'text/html')
  const root = doc.body || doc
  const usedSlugs = new Set<string>()
  const outline: OutlineItem[] = []

  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    if (heading.closest('svg')) return
    const text = (heading.textContent || '').trim()
    if (!text) return

    let slug = heading.id
    if (!slug) {
      const base = slugifyHeading(text)
      slug = base
      let i = 1
      while (usedSlugs.has(slug)) {
        slug = `${base}-${i++}`
      }
    }

    usedSlugs.add(slug)
    outline.push({
      level: parseInt(heading.tagName.charAt(1), 10),
      text,
      slug,
    })
  })

  return outline
}

export function buildAssetUrl(path: string, currentFile?: string | null): string {
  let url = `/api/asset?path=${encodeURIComponent(path)}`
  if (currentFile) url += `&base=${encodeURIComponent(currentFile)}`
  return url
}

export interface ExtractedHtml {
  bodyHtml: string
  stylesheetHrefs: string[]
}

export function extractBodyHtml(raw: string): ExtractedHtml {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { bodyHtml: '', stylesheetHrefs: [] }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, 'text/html')

  const stylesheetHrefs: string[] = []
  doc.querySelectorAll('head link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href')
    if (href) stylesheetHrefs.push(href)
  })

  const inlineStyles: string[] = []
  doc.querySelectorAll('head style, body style').forEach(style => {
    const text = style.textContent?.trim()
    if (text) inlineStyles.push(text)
  })

  const body = doc.body
  const bodyHtml = body?.innerHTML?.trim() || ''
  if (bodyHtml) {
    const prefix = inlineStyles.length ? `<style>${inlineStyles.join('\n')}</style>` : ''
    return { bodyHtml: prefix + bodyHtml, stylesheetHrefs }
  }

  return { bodyHtml: raw, stylesheetHrefs: [] }
}

export function rewriteRelativeUrls(
  html: string,
  currentFile?: string | null,
  stylesheetHrefs: string[] = []
): string {
  const container = document.createElement('div')
  container.innerHTML = html

  container.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src')
    if (!src || isExternalUrl(src) || src.startsWith('#') || src.startsWith('data:')) return
    img.setAttribute('src', buildAssetUrl(src, currentFile))
  })

  container.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
    const href = link.getAttribute('href')
    if (!href || isExternalUrl(href)) return
    link.setAttribute('href', buildAssetUrl(href, currentFile))
  })

  for (const href of stylesheetHrefs) {
    if (isExternalUrl(href)) continue
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = buildAssetUrl(href, currentFile)
    container.insertBefore(link, container.firstChild)
  }

  container.querySelectorAll('a[href]').forEach(anchor => {
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || isExternalUrl(href)) return
    const [pathPart] = href.split('#')
    if (!pathPart) return
    const resolved = resolveAgainstCurrentFile(pathPart, currentFile)
    anchor.setAttribute('data-doc-path', resolved)
  })

  return container.innerHTML
}

export function slugifyHeading(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
  return base || 'section'
}
