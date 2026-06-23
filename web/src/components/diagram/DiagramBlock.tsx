import { useMemo } from 'react'
import { Diagram } from './Diagram'
import { createRenderer, resolveDiagramLanguage } from '@/lib/diagram/engineRegistry'
import { useKrokiConfig } from '@/lib/diagram/config'

interface DiagramBlockProps {
  /** Raw fenced-code language label (e.g. 'mermaid', 'd2', 'dot'). */
  language: string
  code: string
}

/**
 * Entry point for diagram code blocks. Resolves the language label (applying
 * aliases), constructs the appropriate renderer (memoized), and delegates to
 * the shared `<Diagram>` shell.
 *
 * MarkdownViewer routes every fenced code block here; non-diagram languages
 * fall through to normal code highlighting upstream.
 */
export function DiagramBlock({ language, code }: DiagramBlockProps) {
  const { krokiEnabled, krokiUrl } = useKrokiConfig()

  const resolved = resolveDiagramLanguage(language)

  // Reuse the same renderer instance across re-renders so KrokiRenderer's
  // cached-failure state survives parent re-renders.
  const renderer = useMemo(
    () => (resolved ? createRenderer(resolved, krokiEnabled, krokiUrl) : null),
    [resolved, krokiEnabled, krokiUrl],
  )

  if (!resolved || !renderer) return null
  return <Diagram code={code} renderer={renderer} />
}
