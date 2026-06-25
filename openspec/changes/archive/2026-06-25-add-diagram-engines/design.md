## Context

mdserve 当前的图表渲染散落在两处：
- `web/src/components/MermaidDiagram.tsx` (288 行)：把"图表外壳"（toolbar / 预览 / 缩放 / 下载）与"Mermaid 渲染实现"绑死在一个组件里。
- `web/src/components/MarkdownViewer.tsx:99`：单点 `if (language === 'mermaid')` 拦截 fenced code block。

后端（Go）完全不参与图表渲染，只做文件服务。这套实现只能服务 Mermaid 一种引擎。

目标：在不破坏"单二进制部署"卖点、不联网调外部 SaaS 的前提下，把支持范围扩展到 d2 / PlantUML / Structurizr / Graphviz 等主流 DSL。这些引擎大多依赖 JVM 或外部运行时，无法在浏览器内运行，因此需要一个**用户自托管的 Kroki 容器**作为统一渲染服务，mdserve 后端做代理与缓存。

## Goals / Non-Goals

**Goals:**
- 保留 Mermaid 现状（浏览器端渲染，零改动）。
- 通过自托管 Kroki 解锁 14+ 种 DSL，配置驱动，默认零依赖。
- 前端组件抽象化，让新增引擎 = 新增 Renderer。
- 文件缓存跨重启有效，避免重复 Kroki 调用。
- 错误反馈细分，让用户清楚"为什么没渲染 + 怎么修"。

**Non-Goals:**
- 不联网调 kroki.io。
- 不提供 Kroki 容器的自动化部署。
- 不让 Mermaid 走 Kroki。
- 不做缓存清理 CLI / TTL / LRU。
- 不做每引擎精细配置。

## Decisions

### D1：渲染位置——混合策略（Mermaid 客户端 + 其余服务端）

**选择**：保留 Mermaid 浏览器端 npm 包渲染；其余引擎统一走后端代理 → Kroki。

**备选方案与放弃理由**：
- *全客户端 WASM 兵团*（d2 WASM、viz.js 等）：前端 bundle 暴涨、PlantUML/Structurizr 落空。
- *后端原生集成各引擎 CLI*：部署门槛爆炸，破坏单二进制理念。
- *Kroki 统一替代 Mermaid*：增加无谓依赖，丢失开箱即用优势。

**理由**：混合策略让"默认零依赖"与"扩展性"兼得。Mermaid 已稳定运行，无回归风险。

### D2：前端组件抽象——通用 `<Diagram>` + Renderer 接口

**选择**：从 `MermaidDiagram.tsx` 抽出共享外壳为 `<Diagram>`，定义 `DiagramRenderer` 接口，Mermaid 和 Kroki 各实现一份。

```typescript
interface DiagramRenderer {
  readonly engine: string
  isAvailable(): boolean
  render(code: string): Promise<string>
  getUnavailableHint?(): { title: string; solution: string }
}

class DiagramError extends Error {
  kind: 'unsupported' | 'render_failed' | 'service_unavailable' | 'service_timeout'
  engine: string
  detail?: string
}
```

**理由**：
- 这次扩展正好是抽象的好时机，否则两份重复的 toolbar/preview 代码会很快发散。
- `isAvailable()` + `getUnavailableHint()` 让"友好提示"逻辑统一在外壳里，每个 Renderer 不用自己实现。
- 未来加新引擎（如直接走 WASM 的）只需实现接口。

**取舍**：一次性改动比"复制粘贴新建 KrokiDiagram"成本高，但长期维护成本低。值得。

### D3：后端 API——`POST /api/diagram` 直接返 SVG

**选择**：
- 请求：`POST /api/diagram`，JSON body `{engine, code}`。
- 成功响应：`200 image/svg+xml`，body 直接是 SVG 文本。
- 错误响应：JSON `{error, ...}`，HTTP 状态码细分（400 / 422 / 503 / 504）。

**备选方案与放弃理由**：
- *GET + URL 编码*：URL 长度限制，大图会被截断。
- *成功响应包 JSON*：多一层解析，前端 `dangerouslySetInnerHTML` 不如直接拿 SVG 顺手。

**Kroki 调用约定**：`POST {kroki.url}/{engine}/svg`，body 直接传 raw 源码。Kroki 同时支持 raw body 与 deflate+base64url 两种编码，选 raw 简化实现。

### D4：文件缓存——内容寻址 + cache_version

**选择**：
- 路径：`<工作目录>/.mdserve/cache/diagrams/{cache_version}/{engine}/{sha256(code)}.svg`
- key 仅依赖 `cache_version` + `engine` + `code`。
- 不设上限、不做 TTL、不做 LRU。

**理由**：
- 文档场景图数量有限，磁盘膨胀风险低。
- 内容寻址天然支持"源码变即失效"，无需复杂失效逻辑。
- `cache_version` 作为应急开关：Kroki 升级导致渲染结果变化时，bump 一下即全部失效。

**备选方案与放弃理由**：
- *内存 LRU*：重启失效，与"跨重启有效"目标冲突。
- *TTL 过期*：定时清理增加复杂度，且文档场景几乎不需要"刷新"缓存。
- *SQLite 索引*：过度工程，文件系统够用。

### D5：启动探测——轻量健康检查

**选择**：启动时 `GET {kroki.url}/`，1 秒超时，不阻塞主流程。

**理由**：
- 一次轻量探测成本可忽略，但能在启动时就给用户反馈，避免"渲染时才发现容器没起"。
- Kroki 根路径默认返回 200，是合适的健康检查端点。

**取舍**：探测失败不阻止启动（Kroki 可能晚于 mdserve 启动）。日志中明确提示，渲染时再次失败会兜底报错。

### D6：别名映射——内置静态表

**选择**：硬编码别名表（`dot`→`graphviz`、`c4`/`c4model`→`structurizr`、`pu`/`puml`→`plantuml`），不支持用户自定义。

**备选方案与放弃理由**：
- *配置驱动别名*：YAGNI，主流别名就这几个。
- *动态探测 Kroki 支持的引擎*：增加复杂度，且白名单写死可避免无效请求。

**理由**：保持简单。如未来真有需求，配置项可后加。

### D7：Kroki 调用并发控制——前端限制 + 后端不限制

**选择**：前端并发上限 5（一个文档里通常不会超过这个数的图表），后端不做额外限流。

**理由**：Kroki 自身有线程池，能扛并发。前端限流避免突发请求风暴。后端保持简单。

## Risks / Trade-offs

- **[Kroki 容器版本差异] → 保守白名单 + 渐进降级**
  不同 Kroki 版本支持的引擎集合可能不同。后端写死一个保守白名单；调用时若 Kroki 返回 400（不识别 engine），降级为 `unsupported_engine` 错误。

- **[PlantUML 安全性] → 文档提醒 + 依赖 Kroki 默认沙箱**
  PlantUML 的 `!include` 指令能读本地文件。Kroki 默认禁用此能力，但需在用户文档中明确提示。

- **[缓存目录权限] → 启动时检查 + 友好报错**
  工作目录可能不可写（如只读挂载）。启动时尝试创建缓存目录，失败则拒绝启动并打印明确错误。

- **[大图 / 长代码] → 后端 body 上限 1MB**
  防止恶意或意外的大请求拖垮服务。1MB 对任意合理图表都足够。

- **[Kroki 不可达时的体验] → 三层降级**
  启动时日志提示 → 文档加载时友好错误框 → 不阻塞其他文档内容渲染。

- **[首次渲染慢] → 缓存 + 文档说明**
  PlantUML/Structurizr 首次起 JVM 较慢（数秒）。缓存保证只慢一次。文档需说明此特性。

- **[Mermaid 重构回归风险] → 现有 example 全覆盖测试**
  `example/guides/advanced-formatting.md` 中的 Mermaid 示例必须保持渲染行为完全一致（含主题、toolbar、预览）。

## Migration Plan

本变更新增能力，无破坏性改动。用户迁移路径：

1. **升级 mdserve**：二进制替换即可。Mermaid 渲染行为零变化。
2. **按需启用 Kroki**：在 `.mdserve.yaml` 添加 `diagrams.kroki.url`。
3. **启动 Kroki 容器**：`docker run -d -p 8000:8000 krokiio/kroki`（用户文档提供完整命令）。

**回滚策略**：删除 `.mdserve.yaml` 中的 `diagrams.kroki` 配置即可关闭服务端通路，回到纯 Mermaid 状态。缓存目录 `<工作目录>/.mdserve/cache/` 可手动删除，无副作用。

## Open Questions

实施时需要在以下细节上做工程决策（不影响契约，留待 tasks 阶段决定）：

- Kroki 调用使用 raw body 还是 deflate+base64url 编码？（倾向 raw，简单）
- 后端代理是否复用 HTTP keep-alive 连接池？（倾向是，性能更好）
- 前端 `KrokiRenderer.isAvailable()` 的实现：通过单独的 `/api/diagram/status` 端点查询，还是首次渲染时按响应推断？（倾向后者，少一个端点）
- 主题适配：Kroki 各引擎主题参数不一，是否在第一版统一传一个主题参数？（倾向第一版不传，使用各引擎默认主题）
