# html-rendering Specification

## Purpose
TBD - created by archiving change support-html-rendering. Update Purpose after archive.
## Requirements
### Requirement: HTML 文件发现与文件树展示

系统 SHALL 在文件树扫描中识别扩展名为 `.html` 或 `.htm`（大小写不敏感）的文件，并将其作为可浏览文档节点返回，行为与 Markdown 文件一致（受 ignore 规则约束）。

#### Scenario: HTML 文件出现在文件树
- **WHEN** 工作目录中存在 `docs/guide.html` 且未被 ignore 规则排除
- **THEN** `GET /api/files` 响应 MUST 包含该文件节点
- **AND** 用户 MUST 可通过点击在 SPA 内打开该文档

#### Scenario: 被 ignore 的 HTML 不可见
- **WHEN** HTML 文件路径匹配 `.mdserve.yaml` 中的 ignore 规则
- **THEN** 该文件 MUST NOT 出现在文件树中
- **AND** `GET /api/file?path=...` MUST 返回 404

---

### Requirement: 文件 API 格式标识

`GET /api/file` SHALL 返回文档内容与格式标识。对于 HTML 文件，响应 MUST 包含 `format: "html"`；对于 Markdown 文件，响应 MUST 包含 `format: "markdown"`（或未指定时前端默认为 markdown，向后兼容）。

HTML 文件 MUST NOT 经过 Markdown frontmatter 解析；`tags` 与 `categories` 字段 MUST 省略或为空。

#### Scenario: 加载 HTML 文档
- **WHEN** 客户端请求 `GET /api/file?path=report.html`
- **THEN** 响应 MUST 包含原始 HTML 字符串于 `content` 字段
- **AND** 响应 MUST 包含 `"format": "html"`
- **AND** 响应 MUST 包含 `resolvedPath` 为实际文件路径

#### Scenario: 加载 Markdown 文档保持兼容
- **WHEN** 客户端请求 `GET /api/file?path=README.md`
- **THEN** 响应 MUST 包含 `"format": "markdown"` 或等价默认行为
- **AND** frontmatter 解析行为 MUST 与变更前一致

---

### Requirement: 目录索引回退

当请求路径指向目录时，系统 SHALL 按以下顺序查找默认文档：

1. `README.md`（大小写不敏感）
2. `index.html` 或 `index.htm`（大小写不敏感）

均不存在时 MUST 返回 404。

#### Scenario: 目录仅有 index.html
- **WHEN** 用户访问 `GET /api/file?path=docs/` 且目录内无 README.md 但有 `index.html`
- **THEN** 系统 MUST 返回 `index.html` 的内容
- **AND** `resolvedPath` MUST 为 `docs/index.html`
- **AND** `format` MUST 为 `html`

#### Scenario: 目录同时有 README.md 与 index.html
- **WHEN** 目录内同时存在 `README.md` 与 `index.html`
- **THEN** 系统 MUST 返回 `README.md` 的内容
- **AND** `format` MUST 为 `markdown`

---

### Requirement: HTML 安全渲染

对**非独立交互页**的普通文档 HTML，前端 SHALL 在渲染前使用 DOMPurify（或等效净化库）处理，并 MUST 满足：

- 移除或禁止 `<script>`、`<iframe>`、`<object>`、`<embed>`、`<form>` 标签
- 移除所有 `on*` 事件处理器属性
- 禁止 `javascript:` URL scheme

净化后的 HTML MUST 注入 mdserve 文档内容区域，保留应用侧栏、大纲栏与主题壳层。本需求不适用于「独立交互 HTML」分流后的沙箱 iframe 路径。

#### Scenario: 含脚本的 HTML 被净化
- **WHEN** 普通文档 HTML 内容包含 `<script>alert(1)</script>` 或 `<img onerror="alert(1)">`
- **THEN** 渲染结果 MUST NOT 包含可执行脚本
- **AND** 页面 MUST NOT 弹出 alert 或执行任意 JavaScript

#### Scenario: 完整 HTML 文档只渲染 body
- **WHEN** 非独立交互页的 HTML 内容为含 `<html><head>...</head><body>...</body></html>` 的完整文档
- **THEN** 系统 MUST 仅渲染 `<body>` 内的净化后内容
- **AND** MUST NOT 用 HTML 文档替换整个 mdserve 应用页面

---

### Requirement: 独立交互 HTML

系统 SHALL 将满足以下任一启发式的 HTML 视为独立交互页（而非普通文档 HTML）：

- 根元素带 `data-*` 属性（如 `<html data-theme>`）
- 含外部可执行脚本（`<script src>`，不含 `application/json` / `ld+json` 数据脚本）
- 可执行内联 `<script>` 合计超过约 1500 字符

独立交互页 MUST 在应用内容区内以沙箱 iframe 加载该文件的 `/api/asset` URL，使原页 CSS、脚本与布局按独立文档运行。iframe MUST 设置 `sandbox` 为允许脚本、下载与模态框，且 MUST NOT 同时包含 `allow-scripts` 与 `allow-same-origin`。独立页 MUST NOT 用文档替换整个 mdserve 应用壳层（侧栏、工具栏、大纲栏仍由 SPA 持有）。查看源码模式 MUST 仍展示原始 HTML 文本，不进入 iframe。

#### Scenario: 目录树打开独立交互页
- **WHEN** 用户从文件树打开带 `<html data-theme>`（或大量可执行内联脚本）的完整 HTML 文档
- **THEN** 内容区 MUST 以沙箱 iframe 加载该文件的 `/api/asset` 地址
- **AND** 页面内脚本 MUST 可在 iframe 中运行
- **AND** mdserve 侧栏、工具栏与大纲栏 MUST 仍然可见

#### Scenario: 普通文档 HTML 不进入 iframe
- **WHEN** 用户打开仅含短内联脚本、无 `html[data-*]` 的文档型 HTML（如示例 `sample-page.html`）
- **THEN** 系统 MUST 走 DOMPurify 净化路径
- **AND** MUST NOT 执行其中的 `alert` 等脚本

#### Scenario: 独立页沙箱不与父页共享 origin
- **WHEN** 独立交互页在 iframe 中渲染
- **THEN** iframe `sandbox` MUST NOT 同时包含 `allow-scripts` 与 `allow-same-origin`

---

### Requirement: HTML 资源与链接解析

对**非独立交互页**的普通文档 HTML，内相对路径的资源引用 SHALL 解析规则与 Markdown 一致：

- 相对 `<img src>`、`<a href>`（非 `#` 锚点、非 `http(s)://` 外链）MUST 解析为基于当前文件路径的 `/api/asset?path=...&base=...` URL
- 指向 `.md` / `.html` / `.htm` 的相对链接 MUST 通过 SPA 内导航打开对应文档，而非整页刷新

#### Scenario: 相对图片路径
- **WHEN** 当前文件为 `docs/page.html`，HTML 含 `<img src="images/logo.png">`
- **THEN** 渲染后图片 `src` MUST 指向 `/api/asset?path=images/logo.png&base=docs/page.html`

#### Scenario: 相对文档链接
- **WHEN** HTML 含 `<a href="../guide/getting-started.md">`
- **THEN** 点击链接 MUST 在 SPA 内导航至 `guide/getting-started.md`
- **AND** MUST NOT 触发浏览器整页导航离开 mdserve

---

### Requirement: HTML 文档大纲

对普通文档 HTML，系统 SHALL 从渲染后的 HTML DOM 提取 `h1`–`h6` 标题生成文档大纲。对独立交互页，系统 SHALL 从源码解析 `h1`–`h6`（跳过 SVG 内标题）生成大纲。大纲通过与 Markdown 相同的 Outline 侧栏展示。普通文档标题 MUST 具有可导航的 id（若无则自动生成）。独立页大纲点击 SHALL 尽最大努力通过 iframe 文档 hash 定位，不保证与原页全部标题 id 一致。

#### Scenario: HTML 标题生成大纲
- **WHEN** 普通文档 HTML 内容包含 `<h2 id="setup">安装</h2>` 与 `<h3>依赖</h3>`
- **THEN** 侧栏 Outline MUST 显示对应层级条目
- **AND** 点击大纲项 MUST 平滑滚动至对应标题

#### Scenario: 独立页大纲来自源码
- **WHEN** 用户打开独立交互 HTML，且源码含 `<h1 id="standalone">独立交互 HTML</h1>`
- **THEN** 侧栏 Outline MUST 显示该标题
- **AND** 点击该大纲项 SHOULD 使 iframe 导航至对应 hash

---

### Requirement: HTML 实时刷新

WebSocket 文件变更通知 SHALL 覆盖 `.html` 与 `.htm` 文件。当用户正在查看的 HTML 文件发生写入变更时，前端 MUST 重新拉取并渲染最新内容。

#### Scenario: HTML 文件保存后热更新
- **WHEN** 用户正在查看 `report.html` 且该文件被外部编辑保存
- **THEN** 系统 MUST 通过 WebSocket 通知前端
- **AND** 前端 MUST 自动刷新当前文档内容而无需手动 reload 页面

---

### Requirement: HTML 全文搜索

全文搜索 SHALL 索引 `.html` 与 `.htm` 文件。搜索 MUST 匹配文件名与 HTML 可见文本内容（忽略 `<script>` 与 `<style>` 内文本）。

#### Scenario: 搜索命中 HTML 内容
- **WHEN** 用户搜索关键词且某 HTML 文件的可见文本包含该词
- **THEN** 搜索结果 MUST 包含该 HTML 文件路径
- **AND** 结果 MUST 展示匹配上下文摘要
