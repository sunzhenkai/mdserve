## 1. 后端：文档格式识别与 API

- [x] 1.1 在 `internal/server/handlers.go` 新增 `detectFileFormat(name string) string`（`.md` → `markdown`，`.html`/`.htm` → `html`）
- [x] 1.2 扩展 `handleGetFile`：按扩展名设置响应 `format` 字段；HTML 跳过 frontmatter 解析；Markdown 保持现有逻辑
- [x] 1.3 扩展目录索引：`README.md` 优先，其次 `index.html`/`index.htm`（大小写不敏感）
- [x] 1.4 扩展 `scanDirectory`（`server.go`）：文件树收录 `.html`/`.htm`
- [x] 1.5 添加 handler 单元测试：HTML 文件加载、`format` 字段、目录 index.html 回退、README 优先

## 2. 后端：搜索与实时刷新

- [x] 2.1 扩展 `handleSearch`：walk 时纳入 `.html`/`.htm`，strip `<script>`/`<style>` 后搜索可见文本
- [x] 2.2 扩展 `internal/watcher/watcher.go`：`.html`/`.htm` 写入/创建/删除触发 WebSocket reload（与 `.md` 同等）
- [x] 2.3 添加搜索与 watcher 相关测试

## 3. 前端：依赖与类型

- [x] 3.1 在 `web/package.json` 添加 `dompurify` 与 `@types/dompurify`
- [x] 3.2 扩展 `web/src/types.ts`：`FileFormat = 'markdown' | 'html'`；文件 API 响应类型含 `format`

## 4. 前端：HtmlViewer 组件

- [x] 4.1 创建 `web/src/lib/htmlUtils.ts`：`extractBodyHtml(raw)`、相对 URL 重写（复用 `markdownUtils` 的 `resolveAgainstCurrentFile` / `isExternalUrl`）
- [x] 4.2 创建 `web/src/components/HtmlViewer.tsx`：DOMPurify 净化（禁止 script/iframe/form 等）；注入 prose 容器；处理 `<style>`/`<link rel="stylesheet">`
- [x] 4.3 实现 HTML 内 `<a>` 点击：外链直开、`.md`/`.html` SPA 导航、其它资源走 asset
- [x] 4.4 实现 HTML 内 `<img src>` 相对路径解析与可选预览（复用 `ImagePreviewDialog`）
- [x] 4.5 mount 后从 DOM 提取 `h1`–`h6` 生成 outline（无 id 时自动生成），回调 `onOutlineChange`
- [x] 4.6 支持 `showSource` 模式：展示原始 HTML 源码（与 Markdown 工具栏一致）

## 5. 前端：集成与 UI

- [x] 5.1 扩展 `FileContext`：解析 API 响应 `format` 字段并暴露给 App
- [x] 5.2 修改 `App.tsx`：按 `format === 'html'` 渲染 `HtmlViewer`，否则 `MarkdownViewer`
- [x] 5.3 更新 `FileTree` / `SearchModal`：HTML 文件区分样式（图标或颜色）
- [x] 5.4 确认 `DocumentToolbar`（源码切换、全屏）对 HTML 文档正常工作

## 6. 文档与示例

- [x] 6.1 创建 `example/guides/sample-page.html`：含标题大纲、相对图片、指向 `.md` 的链接、内联样式
- [x] 6.2 创建含 `index.html` 的示例子目录（无 README.md），验证目录回退
- [x] 6.3 更新 `README.md` / `README_EN.md`：说明 HTML 支持与安全限制（无 JS）
- [x] 6.4 更新 `docs/guide/getting-started.md`（或新建 `docs/guide/html.md`）：HTML 文档约定与限制

## 7. 端到端验证

- [x] 7.1 浏览器走查：打开 HTML 文件，确认渲染、大纲、相对资源、SPA 链接导航
- [x] 7.2 安全验证：含 `<script>`/onerror 的 HTML 不执行 JS
- [x] 7.3 实时刷新：编辑当前 HTML 文件，确认 WebSocket 热更新
- [x] 7.4 搜索验证：关键词命中 HTML 文件
- [x] 7.5 回归验证：Markdown 文档渲染、frontmatter、diagram 行为无变化
