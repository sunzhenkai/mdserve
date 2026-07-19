## ADDED Requirements

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

前端 SHALL 在渲染 HTML 内容前使用 DOMPurify（或等效净化库）处理，并 MUST 满足：

- 移除或禁止 `<script>`、`<iframe>`、`<object>`、`<embed>`、`<form>` 标签
- 移除所有 `on*` 事件处理器属性
- 禁止 `javascript:` URL scheme

净化后的 HTML MUST 注入 mdserve 文档内容区域，保留应用侧栏、大纲栏与主题壳层。

#### Scenario: 含脚本的 HTML 被净化
- **WHEN** HTML 内容包含 `<script>alert(1)</script>` 或 `<img onerror="alert(1)">`
- **THEN** 渲染结果 MUST NOT 包含可执行脚本
- **AND** 页面 MUST NOT 弹出 alert 或执行任意 JavaScript

#### Scenario: 完整 HTML 文档只渲染 body
- **WHEN** HTML 内容为含 `<html><head>...</head><body>...</body></html>` 的完整文档
- **THEN** 系统 MUST 仅渲染 `<body>` 内的净化后内容
- **AND** MUST NOT 用 HTML 文档替换整个 mdserve 应用页面

---

### Requirement: HTML 资源与链接解析

HTML 内相对路径的资源引用 SHALL 解析规则与 Markdown 一致：

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

系统 SHALL 从渲染后的 HTML DOM 提取 `h1`–`h6` 标题生成文档大纲，并通过与 Markdown 相同的 Outline 侧栏展示。标题 MUST 具有可导航的 id（若无则自动生成）。

#### Scenario: HTML 标题生成大纲
- **WHEN** HTML 内容包含 `<h2 id="setup">安装</h2>` 与 `<h3>依赖</h3>`
- **THEN** 侧栏 Outline MUST 显示对应层级条目
- **AND** 点击大纲项 MUST 平滑滚动至对应标题

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
