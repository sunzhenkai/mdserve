## Context

mdserve 当前文档链路仅覆盖 Markdown：

- **后端** `scanDirectory` 只收录 `.md`；`handleGetFile` 始终按 Markdown 处理（frontmatter + outline）；目录访问只查找 `README.md`。
- **前端** `MarkdownViewer` 用 `react-markdown` 渲染；`FileContext` 假设所有文档内容为 Markdown 字符串。
- **实时** `watcher` 仅监听 `.md` 变更触发 reload。

许多文档仓库并存 HTML 文件（Jekyll/Hugo 导出、CI 报告、遗留页面）。用户期望在 mdserve 壳层内直接浏览，而非下载或用浏览器单独打开。HTML 引入 XSS 风险，必须在设计阶段明确安全边界。

## Goals / Non-Goals

**Goals:**

- 在现有 SPA 壳层内安全渲染 `.html` / `.htm` 正文。
- 文件树、API、目录索引、WebSocket 与 Markdown 体验对齐。
- 相对资源路径（图片、样式、链接）复用既有 `/api/asset` 与 SPA 导航。
- 从 HTML 提取标题大纲，侧栏 Outline 可用。
- 净化 HTML，默认禁止脚本与事件处理器。

**Non-Goals:**

- 不执行 JavaScript（含 inline script、on* 属性）。
- 不用 iframe 整页替换 mdserve UI。
- 不解析 HTML meta / frontmatter 做 tags 索引。
- 不支持 `.xhtml` 等其它格式。

## Decisions

### D1：渲染方式——净化后注入 DOM（非 iframe）

**选择**：用 DOMPurify 净化 HTML，提取 `<body>` 内 HTML（若无 `<body>` 则整段视为 fragment），通过 `dangerouslySetInnerHTML` 注入到带 `prose` 样式的容器。

**备选与放弃**：

- *sandbox iframe*：隔离好但高度自适应、大纲提取、主题统一困难；且 `allow-same-origin` 下 XSS 仍可能泄露 cookie。
- *整页 iframe 导航*：破坏侧栏/大纲/搜索等壳层体验。

**理由**：与 Markdown 渲染路径一致（同一 content 区域），主题与 Outline 复用成本低。

### D2：安全策略——DOMPurify 默认严格 + 可选 hook 重写 URL

**选择**：

- 使用 `dompurify` 默认配置，显式 `FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form']`。
- 移除所有 `on*` 事件属性（DOMPurify 默认处理）。
- 通过 `afterSanitizeAttributes` hook 将相对 `src`/`href` 重写为 `/api/asset?...`（与 Markdown 一致）。

**理由**：文档服务器首要威胁是 XSS；禁止 script/iframe 可将风险降到可接受范围。用户若需交互页面应使用外部 hosting，而非 mdserve。

### D3：API 契约——`format` 字段分流，内容仍走 `/api/file`

**选择**：`GET /api/file` 响应增加：

```json
{
  "content": "...",
  "format": "html",
  "outline": [],
  "resolvedPath": "docs/page.html"
}
```

- `.md` → `format: "markdown"`（默认，向后兼容）
- `.html` / `.htm` → `format: "html"`，跳过 frontmatter 解析；outline 仍由后端粗提取（可选）或留空由前端 DOM 提取

**备选**：单独 `/api/html` 端点——增加 surface，无必要。

**理由**：单一端点，前端 `FileContext` 只需多读一个字段。

### D4：目录索引优先级——`index.html` 次于 `README.md`

**选择**：访问目录 URL 时：

1. 先找 `README.md`（大小写不敏感，保持现有行为）
2. 若无，再找 `index.html` / `index.htm`
3. 均无 → 404

**理由**：mdserve 以 Markdown 为主，`README.md` 优先避免破坏现有站点；同时兼容常见静态站点习惯。

### D5：完整文档 vs Fragment——只渲染 body 内容

**选择**：若 HTML 含 `<html>`/`<body>`，只取 `<body>` innerHTML；`<head>` 内 `<style>` 可选择性内联注入（净化后）到正文前，`<link rel="stylesheet">` 转为 `/api/asset` 绝对路径后保留。

**理由**：避免 `<html>` 嵌套破坏 React DOM；保留常见静态页样式能力。

### D6：搜索范围——纳入 HTML 纯文本

**选择**：`handleSearch` _walk 时除 `.md` 外也索引 `.html`/`.htm`，跳过 `<script>`/`<style>` 标签内文本（简单 strip 或只搜可见文本）。

**理由**：proposal 列为能力；实现成本低，用户可发现 HTML 文档。

### D7：大纲来源——前端 DOM 提取为主

**选择**：与 Markdown 相同，`HtmlViewer` mount 后从容器 `querySelectorAll('h1..h6')` 生成 outline，通过 `onOutlineChange` 回调。

**理由**：与 `MarkdownViewer` 一致，避免后端重复解析 HTML；净化后 DOM 即真相。

## Risks / Trade-offs

- **[样式冲突] → prose 容器 + scoped 样式**  
  用户 HTML 的全局 CSS 可能影响壳层。Mitigation：只注入 body 内容；`<style>` 标签保留但禁止 `@import url(javascript:...)`；文档说明限制。

- **[复杂 HTML 布局失真] → 文档说明**  
  依赖 `<html>` 全页布局的站点可能显示异常。Mitigation：Non-goals 明确；示例展示 fragment 风格 HTML。

- **[相对路径边缘情况] → 复用 markdownUtils**  
  `../`、query/hash 组合与 Markdown 相同逻辑，需共享 `resolveAgainstCurrentFile`。

- **[大文件性能] → 与 Markdown 同等对待**  
  不做流式渲染；极端大 HTML 可能卡顿，可后续加大小限制。

- **[DOMPurify bundle 体积] → ~20KB gzip**  
  可接受；仅 HTML 文档加载时执行净化。

## Migration Plan

1. **升级 mdserve**：替换二进制 + 前端静态资源。现有 Markdown 行为不变（`format` 默认 `markdown`）。
2. **无需配置**：HTML 支持默认开启。
3. **回滚**：回退版本即可；无数据迁移。

## Open Questions

- `<head><style>` 是否在第一版支持？（倾向：支持内联 `<style>`，`<link>` 转 asset URL）
- 文件树中 HTML 文件是否用 distinct 图标/颜色？（倾向：是，便于区分）
- 后端是否返回空 outline 完全交给前端？（倾向：是，减少重复逻辑）
