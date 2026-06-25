# diagram-rendering Specification

## Purpose
TBD - created by archiving change add-diagram-engines. Update Purpose after archive.
## Requirements
### Requirement: 文本画图配置

系统 SHALL 通过 `.mdserve.yaml` 的 `diagrams.kroki` 配置项控制服务端图表渲染通路。配置 MUST 满足以下 schema：

```yaml
diagrams:
  kroki:
    enabled: boolean       # 默认 false
    url: string            # Kroki 容器根 URL，如 http://localhost:8000
    timeout: duration      # 可选，默认 10s
    cache_version: integer # 可选，默认 1，变更后失效全部缓存
```

Mermaid 客户端渲染 MUST 不依赖此配置，始终可用。

#### Scenario: 配置已启用且 URL 有效
- **WHEN** `.mdserve.yaml` 中 `diagrams.kroki.enabled = true` 且 `url` 指向可达的 Kroki 容器
- **THEN** 系统在启动日志中列出全部支持的引擎（Mermaid + Kroki 引擎集合）
- **AND** 浏览器中所有受支持的 DSL 代码块均可渲染为 SVG

#### Scenario: 配置未启用
- **WHEN** `.mdserve.yaml` 中无 `diagrams.kroki` 或 `enabled = false`
- **THEN** 启动日志 MUST 仅列出 Mermaid，并打印"未配置 Kroki"提示与配置方法
- **AND** 非 Mermaid 的 DSL 代码块 MUST 显示友好提示而非空白

#### Scenario: cache_version 变更
- **WHEN** 用户修改 `cache_version` 值（如从 1 改为 2）
- **THEN** 既有缓存文件 MUST 不再被命中（缓存目录按 version 隔离或文件名包含 version）

---

### Requirement: 引擎支持与别名映射

系统 SHALL 通过 Kroki 统一支持以下引擎：`d2`、`plantuml`、`structurizr`、`graphviz`、`excalidraw`、`wavedrom`、`nomnoml`、`bytefield`、`erd`、`pikchr`、`svgbob`、`blockdiag`、`actdiag`、`seqdiag`、`nwdiag`。

系统 SHALL 接受以下语言标识别名，并归一化为对应 Kroki engine：

| 输入别名 | 归一化 engine |
|---|---|
| `dot` | `graphviz` |
| `c4`、`c4model` | `structurizr` |
| `pu`、`puml` | `plantuml` |

`mermaid` 语言标识 MUST 走客户端渲染，不进入 Kroki 通路。

#### Scenario: 使用别名
- **WHEN** Markdown 中出现 ` ```dot ` 代码块
- **THEN** 系统 MUST 将其作为 `graphviz` 引擎请求 Kroki 渲染

#### Scenario: 使用原生引擎名
- **WHEN** Markdown 中出现 ` ```graphviz ` 代码块
- **THEN** 系统 MUST 直接以 `graphviz` 引擎请求 Kroki 渲染

#### Scenario: 不支持的引擎
- **WHEN** Markdown 中出现 ` ```unknowndsl ` 代码块且不在白名单内
- **THEN** 系统 MUST 返回 HTTP 400，错误码为 `unsupported_engine`
- **AND** 响应体 MUST 包含 `supported` 数组列出全部受支持引擎

---

### Requirement: Mermaid 客户端渲染

系统 SHALL 在浏览器端使用 `mermaid` npm 包渲染 `mermaid` 代码块为 SVG，与既有实现行为一致。

渲染 MUST 不依赖后端代理、不依赖 Kroki 配置。

#### Scenario: Mermaid 代码块渲染
- **WHEN** Markdown 中出现 ` ```mermaid ` 代码块
- **THEN** 浏览器 MUST 调用 `mermaid.render()` 生成 SVG 并嵌入页面
- **AND** SVG MUST 应用当前主题（亮色 / 暗色）

#### Scenario: Mermaid 语法错误
- **WHEN** Mermaid 源码包含语法错误
- **THEN** UI MUST 显示错误信息与源码（与既有行为一致）

---

### Requirement: Kroki 服务端渲染代理

系统 SHALL 在后端提供 `POST /api/diagram` 端点，将图表渲染请求代理至配置的 Kroki URL。

请求体格式 MUST 为：
```json
{ "engine": "d2", "code": "A --> B" }
```

成功响应 MUST 为 HTTP 200，`Content-Type: image/svg+xml`，body 直接为 SVG 文本（不包裹 JSON）。

Kroki 调用 MUST 使用 `POST {kroki.url}/{engine}/svg`，body 为图表源码（deflate + base64url 编码或直接 raw body，二者择一由实现决定）。

#### Scenario: 成功渲染
- **WHEN** 客户端 POST `/api/diagram` 包含合法 `{engine, code}`
- **AND** Kroki 返回 200 + SVG
- **THEN** 后端 MUST 透传 SVG，状态码 200，Content-Type `image/svg+xml`

#### Scenario: 引擎不支持
- **WHEN** `engine` 不在白名单中
- **THEN** 后端 MUST 不调用 Kroki，直接返回 HTTP 400
- **AND** 响应体 JSON 包含 `error: "unsupported_engine"`、`engine`、`supported` 数组

#### Scenario: DSL 语法错误
- **WHEN** Kroki 返回 4xx 并附带错误说明
- **THEN** 后端 MUST 返回 HTTP 422
- **AND** 响应体 JSON 包含 `error: "render_failed"` 与 `message` 字段

#### Scenario: Kroki 服务不可达
- **WHEN** 后端无法建立到 `kroki.url` 的 TCP 连接
- **THEN** 后端 MUST 返回 HTTP 503
- **AND** 响应体 JSON 包含 `error: "service_unavailable"` 与 `url` 字段

#### Scenario: Kroki 调用超时
- **WHEN** Kroki 响应超过 `timeout` 配置
- **THEN** 后端 MUST 返回 HTTP 504
- **AND** 响应体 JSON 包含 `error: "service_timeout"`

---

### Requirement: 渲染结果文件缓存

后端 SHALL 将成功渲染的 SVG 缓存至 `<工作目录>/.mdserve/cache/diagrams/{cache_version}/{engine}/{sha256(code)}.svg`。

缓存 key MUST 仅依赖 `cache_version` + `engine` + `code` 三者，不依赖时间戳、Kroki 版本或其他外部状态。

缓存命中时 MUST 不再调用 Kroki，直接读取文件并返回。

系统 MUST NOT 实施缓存容量上限、TTL 或 LRU 淘汰。

#### Scenario: 首次渲染写入缓存
- **WHEN** 一个 `{engine, code}` 组合首次成功渲染
- **THEN** 后端 MUST 将 SVG 写入对应路径
- **AND** 文件路径 MUST 包含当前 `cache_version`

#### Scenario: 缓存命中跳过 Kroki
- **WHEN** 同一 `{engine, code}` 再次请求
- **THEN** 后端 MUST 直接返回缓存文件内容
- **AND** MUST 不发起对 Kroki 的 HTTP 请求

#### Scenario: 源码变更自然失效
- **WHEN** 用户修改了图表源码（即便只改一个字符）
- **THEN** `sha256(code)` MUST 不同
- **AND** 系统 MUST 视为新缓存项，触发 Kroki 调用

#### Scenario: 缓存目录不可写
- **WHEN** `<工作目录>/.mdserve/cache/diagrams/` 无法创建或写入
- **THEN** 启动日志 MUST 打印明确错误
- **AND** 系统 MUST 拒绝启动或降级为不缓存（由实现决定，建议拒绝启动）

---

### Requirement: 启动探测与状态打印

进程启动时 SHALL 对配置的 Kroki URL 执行一次轻量健康探测（如 `GET {url}/`），超时不超过 1 秒，且 MUST 不阻塞主启动流程（异步或快速失败均可）。

启动日志 MUST 打印"图表引擎"小节，根据探测结果展示三种状态之一：未配置、已配置且可达、已配置但不可达。

#### Scenario: 未配置 Kroki
- **WHEN** `.mdserve.yaml` 中无 `diagrams.kroki` 配置
- **THEN** 启动日志 MUST 打印：
  - `✓ mermaid (客户端渲染)`
  - `⚠ 未配置 Kroki，d2 / plantuml / 等将无法渲染`
  - 配置方法提示：`diagrams.kroki.url`

#### Scenario: 已配置且可达
- **WHEN** Kroki 已启用且健康探测成功
- **THEN** 启动日志 MUST 打印：
  - `✓ mermaid (客户端渲染)`
  - `✓ <引擎列表> via Kroki @ {url} [已连接]`

#### Scenario: 已配置但不可达
- **WHEN** Kroki 已启用但健康探测失败（连接拒绝 / 超时 / 非 2xx）
- **THEN** 启动日志 MUST 打印：
  - `✓ mermaid (客户端渲染)`
  - `✗ Kroki 已配置但无法连接 @ {url}`
  - 排查建议（如 `docker ps | grep kroki`）
- **AND** 系统 MUST 仍正常启动（不因 Kroki 不可达而退出）

---

### Requirement: 前端图表组件抽象

前端 SHALL 抽出通用 `<Diagram>` 组件，封装所有引擎共享的 UI：loading 态、错误态、未配置提示、toolbar（源码切换 / 复制 / 下载 SVG / 全屏预览）、PreviewDialog（缩放 / 拖拽 / 滚轮 / fit-to-screen）。

各引擎 MUST 通过实现统一 `DiagramRenderer` 接口注入：

```typescript
interface DiagramRenderer {
  readonly engine: string
  isAvailable(): boolean
  render(code: string): Promise<string>
  getUnavailableHint?(): { title: string; solution: string }
}
```

`MermaidRenderer` 与 `KrokiRenderer` MUST 实现此接口。

#### Scenario: Mermaid 渲染注入
- **WHEN** MarkdownViewer 拦截到 `mermaid` 代码块
- **THEN** MUST 实例化 `MermaidRenderer` 并传给 `<Diagram>`
- **AND** `isAvailable()` MUST 始终返回 `true`

#### Scenario: Kroki 渲染注入
- **WHEN** MarkdownViewer 拦截到 `d2` 代码块
- **THEN** MUST 实例化 `KrokiRenderer('d2')` 并传给 `<Diagram>`
- **AND** `isAvailable()` MUST 根据后端 Kroki 配置状态返回

#### Scenario: 通用外壳复用
- **WHEN** 任一 Renderer 渲染成功
- **THEN** 展示的 toolbar、预览对话框、下载按钮 MUST 行为一致（来自 `<Diagram>` 共享实现）

---

### Requirement: 未配置与错误状态的用户反馈

前端 MUST 针对四种状态给出差异化 UI：

1. **未配置 Kroki**：显示警告图标 + 标题"未配置 Kroki，无法渲染 {engine} 图表" + 操作步骤（启动 Kroki 容器命令 + `.mdserve.yaml` 配置示例）+ 可折叠源码区。
2. **服务不可达**：显示错误图标 + "无法连接 Kroki 服务 @ {url}" + 提示检查容器状态 + 可折叠源码区。
3. **DSL 语法错误**：显示错误图标 + Kroki 返回的具体错误消息 + 源码（默认展开）。
4. **不支持的引擎**：显示提示 + "不支持的图表类型：{engine}" + 受支持引擎列表 + 源码。

#### Scenario: 未配置时显示操作步骤
- **WHEN** 用户访问一个包含 `d2` 代码块的文档，且后端 Kroki 未配置
- **THEN** UI MUST 显示启动 Kroki 的 `docker run` 命令
- **AND** MUST 显示 `.mdserve.yaml` 的配置代码段

#### Scenario: 折叠源码默认隐藏
- **WHEN** 未配置 / 不可达状态下首次渲染
- **THEN** 源码 MUST 默认折叠（点击 `▸ 查看源码` 展开）
- **EXCEPT** DSL 语法错误状态下源码 MUST 默认展开以便用户对照错误行号

#### Scenario: 三种错误状态的视觉区分
- **WHEN** 系统返回 `service_unavailable` / `render_failed` / `unsupported_engine`
- **THEN** UI MUST 展示不同标题与提示文案，不可混淆

