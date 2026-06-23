import { useState } from 'react'
import { AlertTriangle, AlertCircle, ChevronRight, FileCode2 } from 'lucide-react'
import type { DiagramError, DiagramUnavailableHint } from '@/lib/diagram/types'
import { KROKI_ENGINES } from '@/lib/diagram/engineRegistry'

interface DiagramErrorStateProps {
  error: DiagramError
  code: string
}

interface DiagramUnavailableStateProps {
  hint: DiagramUnavailableHint
  engine: string
  code: string
}

/** Toggleable source block. `defaultOpen` lets DSL errors expand by default. */
function SourceBlock({ code, defaultOpen = false, label = '查看源码' }: { code: string; defaultOpen?: boolean; label?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        <FileCode2 className="h-3 w-3" />
        {label}
      </button>
      {open && (
        <pre className="mt-2 rounded-md border border-border bg-muted/40 p-3 overflow-x-auto">
          <code className="text-sm font-mono text-foreground whitespace-pre">{code}</code>
        </pre>
      )}
    </div>
  )
}

/**
 * Renders the rich "not configured" / "unavailable" hint (with docker command
 * and yaml snippet parsed out of the hint.solution fenced blocks).
 */
export function DiagramUnavailableState({ hint, engine, code }: DiagramUnavailableStateProps) {
  return (
    <div className="diagram-error flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
        <div className="text-sm">
          <div className="font-medium text-foreground">{hint.title}</div>
          <HintSolution body={hint.solution} />
        </div>
      </div>
      <SourceBlock code={code} label={`查看 ${engine} 源码`} />
    </div>
  )
}

/**
 * Renders a fenced-code-aware hint body. Splits on ``` blocks and renders
 * the code portions in <pre> elements so the docker/yaml snippets are
 * readable and copyable.
 */
function HintSolution({ body }: { body: string }) {
  const parts = body.split(/```/)
  return (
    <div className="mt-1 space-y-1 text-muted-foreground">
      {parts.map((part, i) => {
        // Even indices are prose, odd indices are fenced code (lang on first line).
        if (i % 2 === 0) {
          return part.trim() ? (
            <p key={i} className="leading-relaxed whitespace-pre-line">{part.trim()}</p>
          ) : null
        }
        const lines = part.split('\n')
        // Drop leading language token (bash/yaml) for display.
        const code = lines[0]?.match(/^(bash|yaml|sh)$/i) ? lines.slice(1).join('\n') : part
        return (
          <pre key={i} className="my-1 rounded-md border border-border bg-muted/60 p-2 overflow-x-auto text-xs">
            <code className="font-mono text-foreground whitespace-pre">{code.trim()}</code>
          </pre>
        )
      })}
    </div>
  )
}

/**
 * Renders differentiated error UI for the four error kinds.
 * - render_failed: source expanded by default (line-by-line comparison).
 * - others: source collapsed by default.
 */
export function DiagramErrorState({ error, code }: DiagramErrorStateProps) {
  switch (error.kind) {
    case 'render_failed':
      return (
        <div className="diagram-error flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div className="text-sm">
              <div className="font-medium text-foreground">{error.engine} 渲染失败（DSL 语法错误）</div>
              {error.message && (
                <pre className="mt-1 rounded-md border border-border bg-muted/60 p-2 overflow-x-auto text-xs">
                  <code className="font-mono text-foreground whitespace-pre-wrap">{error.message}</code>
                </pre>
              )}
            </div>
          </div>
          {/* Default expanded so the user can cross-reference line numbers. */}
          <SourceBlock code={code} defaultOpen label="查看源码（已展开）" />
        </div>
      )

    case 'service_unavailable':
    case 'service_timeout':
      return (
        <div className="diagram-error flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {error.kind === 'service_timeout' ? 'Kroki 响应超时' : '无法连接 Kroki 服务'}
              </div>
              <p className="text-muted-foreground mt-1">
                {error.url && <>地址：<code className="font-mono text-xs">{error.url}</code><br /></>}
                请检查 Kroki 容器是否正常运行，例如 <code className="font-mono text-xs">docker ps | grep kroki</code>。
              </p>
            </div>
          </div>
          <SourceBlock code={code} label={`查看 ${error.engine} 源码`} />
        </div>
      )

    case 'unsupported':
      return (
        <div className="diagram-error flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div className="text-sm">
              <div className="font-medium text-foreground">
                不支持的图表类型：<code className="font-mono text-xs">{error.engine}</code>
              </div>
              <p className="text-muted-foreground mt-1">受支持的 Kroki 引擎：</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from(KROKI_ENGINES).sort().map(e => (
                  <span key={e} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-xs font-mono">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <SourceBlock code={code} label="查看源码" />
        </div>
      )

    default:
      return null
  }
}
