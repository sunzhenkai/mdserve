import type { DiagramRenderer, DiagramError, DiagramUnavailableHint } from './types'
import { withKrokiSlot } from './engineRegistry'

/**
 * Renders diagrams by proxying to a self-hosted Kroki container through the
 * backend `/api/diagram` endpoint.
 *
 * Availability semantics:
 * - `isAvailable()` reflects whether Kroki is configured (krokiEnabled).
 *   When false, `<Diagram>` shows the "未配置" hint without calling render.
 * - Once a render returns `service_unavailable`/`service_timeout`, the
 *   instance caches that failure so subsequent identical requests short-
 *   circuit (per task 8.2) rather than hammering a dead service.
 */
export class KrokiRenderer implements DiagramRenderer {
  readonly engine: string
  private readonly enabled: boolean
  private readonly url: string
  private cachedFailure: DiagramError | null = null

  constructor(engine: string, krokiEnabled: boolean, krokiUrl: string) {
    this.engine = engine
    this.enabled = krokiEnabled
    this.url = krokiUrl
  }

  isAvailable(): boolean {
    return this.enabled
  }

  async render(code: string): Promise<string> {
    // Short-circuit on a previously-observed service failure.
    if (this.cachedFailure) throw this.cachedFailure

    return withKrokiSlot(async () => {
      const res = await fetch('/api/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: this.engine, code }),
      })

      if (res.ok) {
        return res.text() // SVG payload
      }

      const err = this.mapResponse(res.status, await this.safeErrorBody(res))
      // Cache service-level failures so we don't retry a known-dead endpoint.
      if (err.kind === 'service_unavailable' || err.kind === 'service_timeout') {
        this.cachedFailure = err
      }
      throw err
    })
  }

  getUnavailableHint(): DiagramUnavailableHint {
    return {
      title: `未配置 Kroki，无法渲染 ${this.engine} 图表`,
      solution: [
        'Kroki 是一个支持 d2 / plantuml / graphviz 等数十种图表 DSL 的自托管渲染服务。',
        '',
        '1. 启动 Kroki 容器：',
        '```bash',
        'docker run -d --name kroki -p 8000:8000 yuzutech/kroki',
        '```',
        '',
        '2. 在 `.mdserve.yaml` 中启用：',
        '```yaml',
        'diagrams:',
        '  kroki:',
        '    enabled: true',
        `    url: "${this.url || 'http://localhost:8000'}"`,
        '```',
        '',
        '3. 重启 mdserve，启动日志会显示「✓ ... via Kroki [已连接]」。',
      ].join('\n'),
    }
  }

  /** Maps an HTTP failure status to a DiagramError. */
  private mapResponse(status: number, body: KrokiErrorBody): DiagramError {
    const engine = body.engine ?? this.engine
    switch (status) {
      case 400:
        return {
          kind: 'unsupported',
          engine,
          message: body.message,
          supported: body.supported,
        }
      case 422:
        return {
          kind: 'render_failed',
          engine,
          message: body.message ?? '图表渲染失败，请检查 DSL 语法',
        }
      case 503:
        return {
          kind: 'service_unavailable',
          engine,
          message: body.message,
          url: body.url ?? this.url,
        }
      case 504:
        return {
          kind: 'service_timeout',
          engine,
          message: body.message,
          url: body.url ?? this.url,
        }
      default:
        return {
          kind: 'service_unavailable',
          engine,
          message: body.message ?? `未知错误 (HTTP ${status})`,
          url: body.url ?? this.url,
        }
    }
  }

  private async safeErrorBody(res: Response): Promise<KrokiErrorBody> {
    try {
      return (await res.json()) as KrokiErrorBody
    } catch {
      return { message: `HTTP ${res.status}` }
    }
  }
}

interface KrokiErrorBody {
  error?: string
  engine?: string
  message?: string
  url?: string
  supported?: string[]
}
