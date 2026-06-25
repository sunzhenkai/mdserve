## Why

mdserve 目前仅支持 Mermaid 一种文本画图，无法满足用户对 d2 / PlantUML / Structurizr / Graphviz 等常用 DSL 的渲染需求。这些引擎大多依赖 JVM 或外部运行时，无法像 Mermaid 那样在浏览器内完成，需要一个统一的服务端渲染通路。

## What Changes

- **新增 Kroki 集成通路**：后端新增 `POST /api/diagram` 代理，转发请求到用户自托管的 [Kroki](https://kroki.io) 容器，统一支持 14+ 种图表 DSL。
- **保留 Mermaid 现状**：继续走浏览器端 `mermaid` npm 包渲染，零改动，开箱即用。
- **配置驱动**：在 `.mdserve.yaml` 新增 `diagrams.kroki` 配置项，未配置时仅 Mermaid 可用。
- **前端组件抽象**：抽出通用 `<Diagram>` 外壳（toolbar / 预览 / 缩放 / 下载）+ `Renderer` 接口，`MermaidRenderer` 与新增的 `KrokiRenderer` 实现同一契约。
- **文件缓存**：后端基于 `<工作目录>/.mdserve/cache/diagrams/{engine}/{sha256(code)}.svg` 做内容寻址缓存，跨重启有效。
- **启动探测**：进程启动时轻量探测 Kroki 可达性，并打印当前支持的图表引擎清单（未配置时给出提示）。
- **别名兼容**：`dot` → `graphviz`、`c4`/`c4model` → `structurizr`、`pu`/`puml` → `plantuml`。
- **错误细分**：未配置 / 服务不可达 / DSL 语法错 / 不支持引擎 四种状态分别给出针对性 UI 反馈。

## Capabilities

### New Capabilities
- `diagram-rendering`: 文本画图的统一渲染能力——包含 Mermaid 客户端渲染、Kroki 服务端代理、配置开关、缓存策略、别名映射、错误反馈、启动探测的端到端契约。

### Modified Capabilities
- 无。当前 Mermaid 实现散落在 `MermaidDiagram.tsx` 中、未在 specs 目录下形成 spec，本次重构将其纳入 `diagram-rendering` 统一管理。

## Non-goals

- **不**联网调用 kroki.io：隐私与内网友好性是底线，必须自托管。
- **不**提供 Kroki 容器的自动化部署（docker compose / 安装脚本）：保持 mdserve 单二进制理念。
- **不**让 Mermaid 走 Kroki：保留其浏览器端实现，避免无谓的依赖。
- **不**做缓存清理 CLI / TTL / LRU 淘汰：内容寻址已足够，YAGNI。
- **不**支持每引擎精细配置（如单独 URL / 关闭）：粗线配置（一个 URL 顶配）即满足主场景。
- **不**做 SVG 后处理（水印 / 主题切换 / 样式注入）：超出当前范围。

## Impact

- **后端**：`internal/` 新增 diagram handler、缓存模块、Kroki 客户端；启动流程新增探测与日志。
- **前端**：`web/src/components/` 重构 `MermaidDiagram.tsx` 为 `<Diagram>` + 两个 Renderer；新增 `/api/diagram` 客户端调用。
- **配置**：`.mdserve.yaml` 新增 `diagrams.kroki` schema；新增示例与文档。
- **依赖**：前端无新增 npm 包；后端无新增 Go 依赖（标准库 net/http 即可）。
- **部署**：用户若需 d2/plantuml 等需自行运行 Kroki 容器，文档需说明。
