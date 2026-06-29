/** Parse a simple SVG length (px / pt / bare number). Percentages are ignored. */
export function parseSvgLength(raw: string | null | undefined): number | null {
  if (!raw) return null
  const m = raw.trim().match(/^([\d.]+)(px|pt)?$/i)
  return m ? Number(m[1]) : null
}

function readSvgSize(svg: SVGSVGElement): { w: number; h: number } | null {
  const w = parseSvgLength(svg.getAttribute('width'))
  const h = parseSvgLength(svg.getAttribute('height'))
  if (w && h) return { w, h }

  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { w: parts[2], h: parts[3] }
    }
  }
  return null
}

/**
 * Resolve the intrinsic pixel size of a rendered diagram SVG.
 * Kroki engines (notably d2) often emit an outer <svg viewBox="…"> wrapper
 * without width/height; inline preview still works because `.diagram-figure svg`
 * applies `max-width: 100%`, but a fullscreen container with `max-w-none`
 * collapses those SVGs to zero width unless we derive size from viewBox.
 */
export function measureDiagramSvg(root: HTMLElement): { w: number; h: number } {
  const svg = root.querySelector('svg')
  if (!svg) {
    return { w: root.scrollWidth, h: root.scrollHeight }
  }

  const rect = svg.getBoundingClientRect()
  if (rect.width > 1 && rect.height > 1) {
    return { w: rect.width, h: rect.height }
  }

  const fromOuter = readSvgSize(svg)
  if (fromOuter) return fromOuter

  const nested = svg.querySelector('svg')
  if (nested) {
    const fromNested = readSvgSize(nested)
    if (fromNested) return fromNested
  }

  try {
    const box = svg.getBBox()
    if (box.width > 0 && box.height > 0) {
      return { w: box.width, h: box.height }
    }
  } catch {
    // getBBox throws when the SVG is not yet laid out.
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
