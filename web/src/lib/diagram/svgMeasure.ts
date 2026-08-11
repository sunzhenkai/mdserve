/** Parse a simple SVG length (px / pt / bare number). Percentages are ignored. */
export function parseSvgLength(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = raw.trim().match(/^([\d.]+)(px|pt)?$/i)
  if (!match) return null

  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

function readSvgSize(svg: SVGSVGElement): { w: number; h: number } | null {
  const w = parseSvgLength(svg.getAttribute('width'))
  const h = parseSvgLength(svg.getAttribute('height'))
  if (w !== null && h !== null) return { w, h }

  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number)
    if (
      parts.length === 4
      && Number.isFinite(parts[2])
      && Number.isFinite(parts[3])
      && parts[2] > 0
      && parts[3] > 0
    ) {
      return { w: parts[2], h: parts[3] }
    }
  }
  return null
}

function isVisibleSize(size: { w: number; h: number }): boolean {
  return Number.isFinite(size.w) && Number.isFinite(size.h) && size.w > 0 && size.h > 0
}

/**
 * Resolve the intrinsic pixel size of a rendered diagram SVG. Prefer authored
 * width/height and viewBox values so the preview is independent from layout or
 * transform styles already applied to the page. getBBox and rendered bounds
 * remain fallbacks for SVGs without usable metadata.
 */
export function measureDiagramSvg(root: HTMLElement): { w: number; h: number } {
  const svg = root.querySelector('svg')
  if (!svg) return { w: root.scrollWidth, h: root.scrollHeight }

  const fromOuter = readSvgSize(svg)
  if (fromOuter) return fromOuter

  const nested = svg.querySelector('svg')
  if (nested) {
    const fromNested = readSvgSize(nested)
    if (fromNested) return fromNested
  }

  try {
    const box = svg.getBBox()
    if (isVisibleSize({ w: box.width, h: box.height })) {
      return { w: box.width, h: box.height }
    }
  } catch {
    // getBBox throws when the SVG is not yet laid out.
  }

  const rect = svg.getBoundingClientRect()
  if (isVisibleSize({ w: rect.width, h: rect.height })) {
    return { w: rect.width, h: rect.height }
  }

  return { w: root.scrollWidth, h: root.scrollHeight }
}

/** Pin explicit pixel dimensions on viewBox-only SVG roots so they stay visible. */
export function ensureSvgVisibleSize(root: HTMLElement, size: { w: number; h: number }) {
  const svg = root.querySelector('svg')
  if (!svg || !size.w || !size.h) return
  if (!parseSvgLength(svg.getAttribute('width'))) {
    svg.style.width = `${size.w}px`
  }
  if (!parseSvgLength(svg.getAttribute('height'))) {
    svg.style.height = `${size.h}px`
  }
}
