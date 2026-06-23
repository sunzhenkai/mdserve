/**
 * Diagram rendering abstraction shared by all diagram engines.
 *
 * Mermaid renders client-side via the `mermaid` npm package; everything else
 * is proxied through the backend `/api/diagram` endpoint to a self-hosted
 * Kroki container. Both paths implement the same `DiagramRenderer` contract
 * so the `<Diagram>` shell can treat them uniformly.
 */

/** Classified failure kinds for diagram rendering. */
export type DiagramErrorKind =
  /** Engine not on the Kroki whitelist. Maps to backend HTTP 400. */
  | 'unsupported'
  /** DSL syntax / rendering error from Kroki. Maps to HTTP 422. */
  | 'render_failed'
  /** Kroki endpoint unreachable (TCP refused, DNS, etc). Maps to HTTP 503. */
  | 'service_unavailable'
  /** Kroki call exceeded the configured timeout. Maps to HTTP 504. */
  | 'service_timeout'

/** Structured diagram error surfaced to the UI for differentiated feedback. */
export interface DiagramError {
  kind: DiagramErrorKind
  engine: string
  message?: string
  url?: string
  supported?: string[]
}

/** Hint shown when a renderer is not available (e.g. Kroki not configured). */
export interface DiagramUnavailableHint {
  title: string
  /** Solution body. May contain fenced code blocks (```...```). */
  solution: string
}

/**
 * Renderer contract. Each engine implements one instance.
 * - `isAvailable()` gates whether render() is attempted at all.
 * - `render(code)` returns SVG markup or throws a DiagramError.
 * - `getUnavailableHint()` provides guidance when isAvailable() is false.
 */
export interface DiagramRenderer {
  readonly engine: string
  isAvailable(): boolean
  render(code: string): Promise<string>
  getUnavailableHint?(): DiagramUnavailableHint
}

/**
 * Helper to build a DiagramError with kind defaulted appropriately.
 * Used by renderers when mapping backend responses.
 */
export function diagramError(
  kind: DiagramErrorKind,
  engine: string,
  extra: Partial<Omit<DiagramError, 'kind' | 'engine'>> = {},
): DiagramError {
  return { kind, engine, ...extra }
}
