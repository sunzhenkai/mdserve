import { isExternalUrl, resolveAgainstCurrentFile } from '@/lib/markdownUtils'

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
