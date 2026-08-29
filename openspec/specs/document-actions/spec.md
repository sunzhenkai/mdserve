# document-actions Specification

## Purpose
TBD - created by archiving change doc-copy-and-image-download. Update Purpose after archive.
## Requirements
### Requirement: 文档工具栏可复制源码

系统 SHALL 在文档工具栏提供「复制源码」操作，将当前文档的原始内容（与「查看源码」所展示的文本一致）写入系统剪贴板。

复制成功后 MUST 向用户提供短暂的成功反馈（例如图标切换为已复制状态）。内容不可用时 MUST 禁用复制操作或使其无效。

#### Scenario: 复制 Markdown 文档源码
- **WHEN** 用户打开一篇 Markdown 文档并点击「复制源码」
- **THEN** 系统 MUST 将该文档的原始 Markdown 文本写入剪贴板
- **AND** 界面 MUST 显示复制成功反馈

#### Scenario: 复制 HTML 文档源码
- **WHEN** 用户打开一篇 HTML 文档并点击「复制源码」
- **THEN** 系统 MUST 将该文档的原始 HTML 文本写入剪贴板

#### Scenario: 无内容时不可复制
- **WHEN** 当前没有可用的文档内容
- **THEN** 「复制源码」操作 MUST 不可用或点击无效果

---

### Requirement: HTML 文档可打开独立展示页

当当前文档为 HTML 时，系统 SHALL 在文档工具栏提供「打开独立展示页」操作，在新标签页打开该文件的 `/api/asset` 原页（不带 mdserve 应用壳层）。Markdown 文档 MUST NOT 显示该入口。

#### Scenario: 打开 HTML 独立展示页
- **WHEN** 用户打开一篇 HTML 文档并点击「打开独立展示页」
- **THEN** 系统 MUST 在新标签页打开该文件的 `/api/asset` 地址
- **AND** 独立页 MUST 为浏览器原生渲染的完整 HTML，而非 SPA 内容区

#### Scenario: Markdown 不显示独立页入口
- **WHEN** 用户打开一篇 Markdown 文档
- **THEN** 文档工具栏 MUST NOT 显示「打开独立展示页」

---

### Requirement: 保留下载文档

系统 SHALL 继续提供「下载文档」操作，将当前文档原始内容保存为本地文件，文件名基于当前文档路径的 basename。

本能力 MUST 与「复制源码」并存，不得因新增复制而移除或替换下载入口。

#### Scenario: 下载文档源码文件
- **WHEN** 用户打开一篇文档并点击「下载文档」
- **THEN** 浏览器 MUST 下载包含该文档原始内容的文件
- **AND** 下载文件名 MUST 对应当前文档 basename（如 `guide.md`）

---

### Requirement: 图片预览可下载图片

系统 SHALL 在图片全屏预览（`ImagePreviewDialog`）中提供「下载图片」操作，下载当前预览的图片资源。

下载 MUST 适用于 Markdown 与 HTML 文档中打开的图片预览。文件名 SHOULD 尽量可读（优先取 URL 路径最后一段）。当浏览器因跨域等原因无法以文件形式保存时，系统 MUST 提供合理回退（例如在新标签打开原图地址），不得静默失败且无反馈。

#### Scenario: 下载本地资源图片
- **WHEN** 用户点击文档中的本地图片进入预览，并点击「下载图片」
- **THEN** 浏览器 MUST 开始下载该图片
- **AND** 下载文件名 SHOULD 基于资源路径可读命名

#### Scenario: 下载外链图片
- **WHEN** 用户预览外链图片并点击「下载图片」
- **THEN** 系统 MUST 尝试下载该图片
- **AND** 若因跨域无法保存为文件，系统 MUST 回退为打开原图地址或等价可用行为

#### Scenario: Markdown 与 HTML 预览行为一致
- **WHEN** 用户分别从 Markdown 查看器与 HTML 查看器打开图片预览
- **THEN** 预览工具栏 MUST 均提供「下载图片」操作

