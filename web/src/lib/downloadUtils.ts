const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/avif': '.avif',
}

function basenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.href)
    // /api/asset?path=docs/foo.png → 优先取 path 查询参数的末段
    const assetPath = parsed.searchParams.get('path')
    if (assetPath) {
      const assetSegment = assetPath.split('/').filter(Boolean).pop()
      if (assetSegment) return decodeURIComponent(assetSegment)
    }
    const segment = parsed.pathname.split('/').filter(Boolean).pop()
    if (!segment) return null
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const mime = contentType.split(';')[0]?.trim().toLowerCase()
  return mime ? CONTENT_TYPE_EXT[mime] ?? null : null
}

function extensionFromName(name: string | null): string | null {
  if (!name) return null
  const match = name.match(/(\.[a-zA-Z0-9]{1,8})$/)
  return match ? match[1]!.toLowerCase() : null
}

/** 解析下载文件名：优先 URL path 末段，否则 image + 扩展名猜测 */
export function resolveDownloadFileName(url: string, contentType: string | null = null): string {
  const fromPath = basenameFromUrl(url)
  const pathExt = extensionFromName(fromPath)
  if (fromPath && pathExt) return fromPath

  // 仅用 path/basename 猜扩展名，避免整段 URL（含 ?path=...png）误匹配
  const ext = extensionFromContentType(contentType) || pathExt || '.bin'
  if (fromPath) return `${fromPath}${ext}`
  return `image${ext}`
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

/**
 * 通过 fetch 拉取资源并触发浏览器下载。
 * 跨域或失败时回退为新标签打开原地址。
 * @returns 'downloaded' | 'opened'
 */
export async function downloadUrlAsFile(url: string): Promise<'downloaded' | 'opened'> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    const fileName = resolveDownloadFileName(url, response.headers.get('Content-Type'))
    triggerBlobDownload(blob, fileName)
    return 'downloaded'
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
    return 'opened'
  }
}
