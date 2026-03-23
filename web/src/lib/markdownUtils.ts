export function isExternalUrl(href: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(href) || /^(mailto:|tel:|data:)/i.test(href)
}

function normalizeDocPath(path: string): string {
  const segments = path.replace(/\\/g, '/').split('/')
  const stack: string[] = []
  for (const segment of segments) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (stack.length > 0) stack.pop()
      continue
    }
    stack.push(segment)
  }
  return stack.join('/')
}

function dirname(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(0, idx) : ''
}

export function resolveAgainstCurrentFile(targetPath: string, currentFile?: string | null): string {
  const raw = targetPath.replace(/\\/g, '/')
  if (raw.startsWith('/')) {
    return normalizeDocPath(raw.slice(1))
  }
  const baseDir = currentFile ? dirname(currentFile) : ''
  return normalizeDocPath(baseDir ? `${baseDir}/${raw}` : raw)
}

export function looksLikeMarkdownPath(path: string): boolean {
  const withoutQuery = path.split('?')[0]
  const fileName = withoutQuery.split('/').pop() || ''
  if (!fileName) return true
  if (!fileName.includes('.')) return true
  return /\.mdx?$/i.test(fileName)
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    return true
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}
