import type { DiagramRenderer } from './types'
import { MermaidRenderer } from './MermaidRenderer'
import { KrokiRenderer } from './KrokiRenderer'

/**
 * User-facing language aliases mapped to canonical Kroki engine names.
 * Mirrors the backend `engineAliases` table so frontend interception and
 * backend normalization agree.
 */
export const ENGINE_ALIASES: Record<string, string> = {
  dot: 'graphviz',
  c4: 'structurizr',
  c4model: 'structurizr',
  pu: 'plantuml',
  puml: 'plantuml',
}

/** Canonical Kroki engines supported via the backend proxy. */
export const KROKI_ENGINES = new Set<string>([
  'd2', 'plantuml', 'structurizr', 'graphviz', 'excalidraw', 'wavedrom',
  'nomnoml', 'bytefield', 'erd', 'pikchr', 'svgbob', 'blockdiag',
  'actdiag', 'seqdiag', 'nwdiag',
])

/**
 * Resolves a fenced-code language label to either 'mermaid', a canonical
 * Kroki engine name, or null (no diagram). Lower-cases input and applies
 * the alias table.
 */
export function resolveDiagramLanguage(lang: string): string | null {
  if (!lang) return null
  const lower = lang.toLowerCase()
  if (lower === 'mermaid') return 'mermaid'
  const canonical = ENGINE_ALIASES[lower] ?? lower
  return KROKI_ENGINES.has(canonical) ? canonical : null
}

/**
 * Semaphore that bounds concurrent Kroki requests to a fixed limit per
 * document. Kroki can handle concurrency, but a burst of 20 diagrams in one
 * page would be wasteful. Limit of 5 matches design D7.
 */
class Semaphore {
  private active = 0
  private readonly waiters: Array<() => void> = []

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++
      return
    }
    await new Promise<void>(resolve => this.waiters.push(resolve))
    this.active++
  }

  release(): void {
    this.active--
    const next = this.waiters.shift()
    if (next) next()
  }
}

const krokiSemaphore = new Semaphore(5)

/**
 * Acquires a slot in the Kroki concurrency pool for the duration of `task`.
 * Mermaid is exempt (renders client-side, no network).
 */
export async function withKrokiSlot<T>(task: () => Promise<T>): Promise<T> {
  await krokiSemaphore.acquire()
  try {
    return await task()
  } finally {
    krokiSemaphore.release()
  }
}

/**
 * Renderer registry. Given a resolved language, returns a fresh renderer.
 * Mermaid is always available; Kroki renderers read availability from config
 * on each construction.
 */
export function createRenderer(language: string, krokiEnabled: boolean, krokiUrl: string): DiagramRenderer | null {
  if (language === 'mermaid') {
    return new MermaidRenderer()
  }
  if (KROKI_ENGINES.has(language)) {
    return new KrokiRenderer(language, krokiEnabled, krokiUrl)
  }
  return null
}
