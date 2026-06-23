import mermaid from 'mermaid'
import type { DiagramRenderer, DiagramError } from './types'

/**
 * Renders Mermaid diagrams client-side via the `mermaid` npm package.
 *
 * `isAvailable()` is always true: Mermaid ships with mdserve and needs no
 * configuration or backend. The theme is resolved at render time from the
 * document's current color scheme so dark/light switches apply live.
 */
export class MermaidRenderer implements DiagramRenderer {
  readonly engine = 'mermaid'

  private static renderCounter = 0

  isAvailable(): boolean {
    return true
  }

  async render(code: string): Promise<string> {
    const isDark = document.documentElement.classList.contains('dark')
    // Unique id per render so concurrent diagrams don't collide.
    const id = `mermaid-svg-${++MermaidRenderer.renderCounter}-${Date.now()}`

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: isDark ? 'dark' : 'default',
    })

    try {
      const { svg } = await mermaid.render(id, code)
      return svg
    } catch (err) {
      // Mermaid syntax errors are surfaced as render_failed so the shell can
      // show the (expanded) source for line-by-line comparison.
      const error: DiagramError = {
        kind: 'render_failed',
        engine: 'mermaid',
        message: err instanceof Error ? err.message : 'Mermaid 渲染失败',
      }
      throw error
    }
  }
}
