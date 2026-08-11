export interface DiagramPreviewSize {
  width: number
  height: number
}

export interface DiagramPreviewViewport {
  width: number
  height: number
}

export interface DiagramPreviewZoomBounds {
  min: number
  max: number
}

export const DIAGRAM_PREVIEW_SAFE_MARGIN = 96
const MINIMUM_ZOOM_SCALE = 0.2
const MINIMUM_MAXIMUM_ZOOM_SCALE = 5
const MAX_SCALE_MULTIPLIER = 4

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/**
 * Calculates the largest scale that keeps a diagram inside the real preview
 * viewport while preserving a fixed margin on every side. Small SVGs are
 * deliberately allowed to scale beyond their intrinsic size.
 */
export function calculateDiagramFitScale(
  viewport: DiagramPreviewViewport,
  diagram: DiagramPreviewSize,
): number | null {
  if (!isPositiveFinite(viewport.width) || !isPositiveFinite(viewport.height)) return null
  if (!isPositiveFinite(diagram.width) || !isPositiveFinite(diagram.height)) return null

  const availableWidth = viewport.width - DIAGRAM_PREVIEW_SAFE_MARGIN
  const availableHeight = viewport.height - DIAGRAM_PREVIEW_SAFE_MARGIN
  if (availableWidth <= 0 || availableHeight <= 0) return null

  const scale = Math.min(availableWidth / diagram.width, availableHeight / diagram.height)
  return isPositiveFinite(scale) ? scale : null
}

/**
 * Keeps zoom controls useful for both large diagrams and very small SVGs. The
 * maximum is relative to fit, while retaining the legacy absolute 5x minimum.
 */
export function getDiagramPreviewZoomBounds(fitScale: number): DiagramPreviewZoomBounds {
  const safeFitScale = isPositiveFinite(fitScale) ? fitScale : 1
  return {
    min: Math.min(MINIMUM_ZOOM_SCALE, safeFitScale),
    max: Math.max(MINIMUM_MAXIMUM_ZOOM_SCALE, safeFitScale * MAX_SCALE_MULTIPLIER),
  }
}

export function clampDiagramPreviewScale(scale: number, fitScale: number): number {
  const bounds = getDiagramPreviewZoomBounds(fitScale)
  const safeScale = isPositiveFinite(scale) ? scale : fitScale
  return Math.min(bounds.max, Math.max(bounds.min, safeScale))
}
