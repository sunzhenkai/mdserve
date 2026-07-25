## Context

文档工具栏（`DocumentToolbar`）已提供：查看源码切换、复制源码、下载文档、全屏。图表组件（`Diagram`）另有复制 DSL / 下载 SVG。Markdown/HTML 内嵌图片点击后走 `ImagePreviewDialog`，目前仅有缩放、重置、关闭，**没有下载按钮**。

本变更在规格上固化「复制源码 + 保留下载文档」，并补齐图片预览的下载能力。复制逻辑若已在工具栏落地，实现阶段以核对与补齐缺口为主，避免重复造轮子。

## Goals / Non-Goals

**Goals:**

- 文档工具栏可一键复制当前文档原始内容（Markdown 或 HTML 源），并有短暂成功反馈
- 图片全屏预览可下载当前图片文件，文件名尽量可读
- 既有「下载文档」入口与行为保持不变
- Markdown 与 HTML 查看器打开的图片预览行为一致

**Non-Goals:**

- 不改造图表工具栏（已有下载 SVG）
- 不提供图片右键菜单或行内 hover 下载（预览弹层即可）
- 不新增服务端专用下载 API
- 不支持将多张图片打包下载

## Decisions

### 1. 复制源码：复用文档工具栏 + `copyTextToClipboard`

- **选择**：在 `DocumentToolbar` 提供复制按钮，内容为当前已加载的 `content`（与「查看源码」一致的原始文本）。
- **理由**：与现有下载文档、源码切换同处一栏，发现成本低；`copyTextToClipboard` 已处理 Clipboard API 与 fallback。
- **备选**：仅在源码视图显示复制 → 拒绝，渲染视图下用户也常需要复制。

### 2. 图片下载：在 `ImagePreviewDialog` 增加下载按钮

- **选择**：预览工具栏增加 Download；用当前 `src` 拉取 blob（`fetch` → `Blob` → `<a download>`），失败时回退为新标签打开 `src`。
- **理由**：用户已在预览上下文，意图明确；同源 `/api/asset` 与外链均可走同一路径；无需后端改动。
- **文件名**：优先用 URL path 最后一段；无可用名时用 `image` + 扩展名猜测（由 `Content-Type` 或 URL 后缀），再不行用 `image.bin`。
- **备选**：仅用 `<a href download>` 直接指向 src → 跨域/部分浏览器可能忽略 download 属性，blob 方案更稳。

### 3. 下载文档保持不变

- **选择**：继续由 `App.handleDownload` 用 `content` 生成 Blob，文件名取当前路径 basename。
- **理由**：用户明确要求保留；与复制是互补（文件 vs 剪贴板）。

### 4. 与图表下载的边界

- **选择**：普通 `img`（Markdown/HTML）走 `ImagePreviewDialog` 下载；图表 SVG 仍走 `Diagram` 工具栏。
- **理由**：数据源不同（URL/asset vs 内存中 SVG 字符串），混用易出错。

## Risks / Trade-offs

- [跨域图片 CORS 导致 fetch 失败] → 捕获错误后回退为打开原链接；外链图片可能无法强制改名下载
- [大图 fetch 占用内存] → 单张预览场景可接受；不预缓存
- [复制权限被浏览器拒绝] → 已有 clipboard fallback；失败时不假装成功

## Migration Plan

纯前端 UI 增强，随版本发布即可；无需数据迁移或配置变更。回滚即移除预览下载按钮 / 相关逻辑。

## Open Questions

- （无阻塞项）若后续需要行内图片下载，可另开变更，不在本次范围。
