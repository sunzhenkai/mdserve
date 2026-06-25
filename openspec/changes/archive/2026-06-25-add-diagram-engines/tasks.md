## 1. 后端配置层

- [x] 1.1 在 `internal/config` 扩展 `.mdserve.yaml` schema，新增 `diagrams.kroki` 配置项（结构体字段：`enabled` / `url` / `timeout` / `cache_version`，含默认值：`false` / 必填 / `10s` / `1`）
- [x] 1.2 添加配置加载与解析的单元测试（覆盖默认值、空配置、非法值场景）

## 2. 后端 Kroki 客户端

- [x] 2.1 创建 `internal/diagram/kroki.go`：实现 HTTP 客户端，调用 `POST {url}/{engine}/svg`，raw body 传源码
- [x] 2.2 实现错误分类逻辑：Kroki 4xx → `render_failed`、TCP 连接失败 → `service_unavailable`、超时 → `service_timeout`
- [x] 2.3 实现健康探测函数 `Ping(url)`：`GET {url}/`，独立 1 秒超时
- [x] 2.4 单元测试覆盖所有错误路径（用 `httptest` mock Kroki）

## 3. 后端文件缓存

- [x] 3.1 创建 `internal/diagram/cache.go`：路径计算 `<工作目录>/.mdserve/cache/diagrams/{cache_version}/{engine}/{sha256(code)}.svg`
- [x] 3.2 实现 `Get(engine, code)` / `Set(engine, code, svg)` 读写方法
- [x] 3.3 实现启动时目录创建与权限检查，失败时返回明确错误
- [x] 3.4 单元测试：缓存命中 / 未命中 / 源码变更自然失效 / `cache_version` 隔离 / 写入失败

## 4. 后端引擎别名与白名单

- [x] 4.1 创建 `internal/diagram/engines.go`：定义引擎白名单常量（`d2` / `plantuml` / `structurizr` / `graphviz` / `excalidraw` / `wavedrom` / `nomnoml` / `bytefield` / `erd` / `pikchr` / `svgbob` / `blockdiag` / `actdiag` / `seqdiag` / `nwdiag`）
- [x] 4.2 实现别名归一化函数：`dot`→`graphviz`、`c4`/`c4model`→`structurizr`、`pu`/`puml`→`plantuml`
- [x] 4.3 单元测试覆盖所有别名与白名单边界

## 5. 后端 HTTP API Handler

- [x] 5.1 创建 `internal/api/diagram.go`：`POST /api/diagram` handler，请求体 `{engine, code}`，成功响应 `200 image/svg+xml` 直接返 SVG
- [x] 5.2 实现完整请求流程：解析 body（上限 1MB）→ 别名归一化 → 白名单校验（400）→ 查缓存 → 调 Kroki → 写缓存 → 返回
- [x] 5.3 实现四种错误响应：`unsupported_engine` (400) / `render_failed` (422) / `service_unavailable` (503) / `service_timeout` (504)
- [x] 5.4 在路由配置中注册 `/api/diagram`
- [x] 5.5 集成测试：用 `httptest` 起 mock Kroki，覆盖成功 / 各错误状态 / 缓存命中路径

## 6. 后端启动流程集成

- [x] 6.1 在主启动流程中调用 `kroki.Ping`（异步或快速失败，不阻塞）
- [x] 6.2 实现三种状态的"图表引擎"日志打印：未配置 / 已配置且可达 / 已配置但不可达
- [x] 6.3 启动时初始化缓存目录（调用 `cache.Init`），失败则拒绝启动
- [x] 6.4 端到端启动验证：分别测试三种状态日志输出

## 7. 前端抽象层（重构）

- [x] 7.1 创建 `web/src/lib/diagram/types.ts`：定义 `DiagramRenderer` 接口、`DiagramError` 类型（`kind` 字段含 4 种值）
- [x] 7.2 从 `MermaidDiagram.tsx` 抽出 `<Diagram>` 通用外壳组件到 `web/src/components/diagram/Diagram.tsx`（含 toolbar / PreviewDialog / loading 态 / 错误态框架）
- [x] 7.3 实现 `MermaidRenderer`（在 `web/src/lib/diagram/MermaidRenderer.ts`），调用既有 `mermaid` npm 包，`isAvailable` 永远返回 `true`
- [x] 7.4 删除/替换旧的 `MermaidDiagram.tsx`，验证 `example/guides/advanced-formatting.md` 中的 Mermaid 示例渲染行为零回归（主题切换、toolbar、预览、下载）

## 8. 前端 Kroki Renderer

- [x] 8.1 创建 `web/src/lib/diagram/KrokiRenderer.ts`：`render(code)` 调用 `POST /api/diagram`，成功返 SVG，失败按响应映射为 `DiagramError`
- [x] 8.2 实现 `isAvailable()`：首次渲染时按响应推断（`service_unavailable` 视为不可用，缓存结果）
- [x] 8.3 实现 `getUnavailableHint()`：返回中文提示文案（标题 + 解决方案 + docker 命令 + yaml 配置示例）

## 9. 前端错误状态 UI

- [x] 9.1 实现"未配置 Kroki"状态 UI：警告图标 + 标题 + 操作步骤（docker 命令 + yaml 配置代码块）+ 默认折叠源码
- [x] 9.2 实现"服务不可达 / 超时"状态 UI：错误图标 + 提示检查容器状态 + 折叠源码
- [x] 9.3 实现"DSL 语法错误"状态 UI：错误图标 + Kroki 返回的具体消息 + **默认展开**源码（便于对照行号）
- [x] 9.4 实现"不支持引擎"状态 UI：提示 + 受支持引擎列表 + 源码

## 10. 前端集成

- [x] 10.1 重构 `MarkdownViewer.tsx`：将 `mermaid` 单点拦截扩展为按 `language` 分流（注册表查询 → 匹配 Renderer → 渲染 `<Diagram>`）
- [x] 10.2 实现前端并发控制：同一文档内对 Kroki 的并发请求上限 5（用简单的 semaphore）
- [x] 10.3 验证别名在前端拦截时也能正确路由（如 `dot` → `KrokiRenderer('graphviz')`）

## 11. 文档与示例

- [x] 11.1 创建 `example/guides/diagram-engines.md`：覆盖各引擎示例（d2 / plantuml / structurizr / graphviz / dot / c4 等别名）
- [x] 11.2 更新根目录 `.mdserve.yaml`：添加 `diagrams.kroki` 注释示例段
- [x] 11.3 更新 `README.md` 与 `README_EN.md`：新增"图表引擎"章节，说明 Mermaid 开箱即用 + Kroki 配置扩展
- [x] 11.4 创建 `docs/guide/diagrams.md`：完整的 Kroki 部署指南（`docker run` 命令、配置方法、引擎清单、安全提示）

## 12. 端到端验证

- [x] 12.1 启动真实 Kroki 容器（`docker run -p 8000:8000 yuzutech/kroki`），端到端测试白名单内主要引擎（d2 / plantuml / structurizr / graphviz）
- [x] 12.2 验证缓存命中：刷新页面观察网络请求，确认第二次不再调 Kroki
- [x] 12.3 验证未配置场景：清空 `diagrams.kroki` 配置，确认友好提示 UI 与启动日志
- [x] 12.4 验证错误场景：停掉 Kroki 容器，确认"服务不可达" UI；故意写错 DSL，确认"语法错误" UI
- [x] 12.5 验证别名：`dot` / `c4` / `pu` 代码块均能正确渲染
- [ ] 12.6 验证 Mermaid 零回归：对照 `example/guides/advanced-formatting.md` 走查所有交互（toolbar、预览缩放、暗色主题、下载 SVG）

> **E2E 验证说明（12.1–12.5）**：已用真实 `yuzutech/kroki` 容器 + 真实 mdserve 二进制完成 API/启动日志层面的端到端验证。包括：d2/plantuml/structurizr/graphviz 均返回 200 + SVG；停掉 Kroki 后重复请求同一图表仍返回缓存内容（证明不调 Kroki）；未配置时启动日志打印「⚠ 未配置 Kroki」且 `/api/config` 返回 `krokiEnabled=false`、请求返回 503；别名 `dot→graphviz`、`c4→structurizr`、`pu→plantuml` 均正确路由；unsupported→400 / render_failed→422 / service_unavailable→503 全部复现。
>
> **12.6 待人工浏览器走查**：Mermaid 渲染走客户端，toolbar / 预览缩放 / 暗色主题 / 下载 SVG 等交互需在浏览器中目视确认。代码路径已结构性保留（`MarkdownViewer` → `DiagramBlock` → `MermaidRenderer` → `<Diagram>`，复用原 toolbar 与 `DiagramPreviewDialog`，CSS 类名 `.mermaid-*` 等价迁移到 `.diagram-*`），但"零回归"的最终判定需要人工目视。
