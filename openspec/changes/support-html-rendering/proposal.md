## Why

mdserve 目前仅识别并渲染 `.md` 文件，用户仓库中已有的 HTML 文档（如静态站点导出、工具生成的报告、遗留文档）无法在 Web 界面中浏览。扩展 HTML 支持可以让 mdserve 作为统一文档入口，覆盖 Markdown 与 HTML 两种常见格式，降低迁移成本。

## What Changes

- **文件树与 API**：后端文件扫描、`GET /api/file` 响应扩展，识别 `.html` / `.htm` 文件；API 新增 `format` 字段（`markdown` | `html`）供前端分流渲染。
- **目录索引**：访问目录路径时，除 `README.md` 外，优先查找 `index.html`（大小写不敏感）；两者均不存在时仍返回 404。
- **HTML 渲染组件**：前端新增 `HtmlViewer`，在应用壳层（侧栏、大纲、工具栏）内渲染 HTML 正文，而非整页跳转或 iframe 全页替换。
- **安全净化**：渲染前经 DOMPurify 净化，默认剥离 `<script>`、事件处理器与 `javascript:` URL，防止 XSS。
- **资源与链接解析**：HTML 内相对路径的 `<img>` / `<a>` / `<link>` 等资源，复用现有 `/api/asset` 与 SPA 内导航逻辑，与 Markdown 行为一致。
- **大纲提取**：从净化后的 DOM 提取 `h1`–`h6` 生成侧栏大纲，与 Markdown 体验对齐。
- **实时刷新**：WebSocket 监听 `.html` / `.htm` 变更，热更新当前打开的 HTML 文档。
- **搜索（可选扩展）**：全文搜索纳入 HTML 文件，搜索文件名与可见文本内容。

## Capabilities

### New Capabilities

- `html-rendering`：HTML 文档的发现、加载、安全渲染、资源解析、大纲提取与实时刷新的端到端契约。

### Modified Capabilities

- 无。现有 `navigation-menu`、`diagram-rendering` 等 spec 的行为契约不变；菜单项仍通过 `path` 指向任意文档，HTML 支持由新 capability 覆盖。

## Non-goals

- **不**执行 HTML 内嵌 JavaScript：净化后移除脚本，不做 sandbox iframe 全功能浏览器。
- **不**支持完整 HTML 文档替换应用布局（`<html>` 整页模式）：HTML 仅渲染 `<body>` 内容区域，保留 mdserve 侧栏与主题壳。
- **不**解析 HTML frontmatter 或 tags/categories 元数据：首版仅渲染正文。
- **不**将 HTML 纳入标签索引（tag indexer）：标签体系仍限于 Markdown frontmatter。
- **不**提供 HTML → Markdown 转换或编辑能力。
- **不**支持 `.xhtml`、MHTML 等其它格式。

## Impact

- **后端**：`internal/server/handlers.go`（文件 API、目录索引）、`server.go`（文件树扫描）、`internal/watcher/watcher.go`（变更监听）、`handleSearch`（可选）。
- **前端**：新增 `HtmlViewer` 组件；`App.tsx` 按 `format` 分流；`FileContext` 解析 API 响应；`FileTree` / `SearchModal` 展示 HTML 文件图标或样式。
- **依赖**：前端新增 `dompurify`（及 `@types/dompurify`）。
- **文档**：`README.md`、`example/` 增加 HTML 示例页。
