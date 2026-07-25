## Why

文档页已有「查看源码」「下载文档」等操作，但用户还需要一键复制整篇源码，以及在图片预览中下载图片；目前图片预览只有缩放/关闭，缺少下载入口，复制能力也需在规格上固化并保证各场景可用。

## What Changes

- 文档工具栏支持「复制源码」：将当前文档原始内容写入剪贴板，并给出成功反馈
- 图片预览支持「下载图片」：从 Markdown/HTML 文档打开的图片预览中可下载当前图片
- 保留既有「下载文档」（下载源码文件）行为，不改动其语义与入口
- 图表组件已有的复制源码 / 下载 SVG 保持不变（非本变更范围的改造目标）

## Non-goals

- 不改动文档「查看源码 / 查看渲染」切换逻辑
- 不新增批量下载、导出 PDF/ZIP 等能力
- 不改变 `/api/asset` 鉴权与路径解析规则
- 不重做图表（Mermaid/Kroki）工具栏交互

## Capabilities

### New Capabilities
- `document-actions`: 文档级操作（复制源码、下载文档）与图片预览下载的行为约定

### Modified Capabilities
- （无）既有 `diagram-rendering` / `html-rendering` 规格不因本变更修改需求条文

## Impact

- 前端：`DocumentToolbar`、`ImagePreviewDialog`，以及 Markdown/HTML 查看器中图片预览的调用链
- 可能复用已有 `copyTextToClipboard` 与 blob 下载模式（与文档下载、图表 SVG 下载一致）
- 无后端 API 变更；图片下载走浏览器对已解析 `src`（含 `/api/asset`）的拉取
