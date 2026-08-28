# HTML 文档支持

mdserve 除 Markdown 外，还支持在 Web 界面中浏览 `.html` / `.htm` 文件。

## 基本用法

将 HTML 文件放入文档目录即可，文件树会自动收录。点击文件后在应用壳层（侧栏、大纲、工具栏）内打开。

普通文档 HTML 只渲染净化后的 `<body>`。带 `html[data-*]`、外部脚本、或大量内联脚本的**独立交互页**（例如架构图导出）会在内容区以沙箱 iframe 按原页运行，不替换 mdserve 壳层。

## 目录索引

访问目录路径时，默认文档查找顺序为：

1. `README.md`（大小写不敏感）
2. `index.html` / `index.htm`（大小写不敏感）

## 资源与链接

- 普通文档 HTML 中，相对路径的 `<img>`、`<link rel="stylesheet">` 会通过 `/api/asset` 解析
- 指向 `.md` / `.html` 的相对链接在 SPA 内导航，不会整页刷新
- 外链（`http(s)://`）在新标签页打开
- Markdown 正文里的 `.html` 链接仍直接打开 `/api/asset` 整页（与目录树的 iframe 预览是两条路径）

## 安全限制

普通文档 HTML 渲染前会经 DOMPurify 净化：

- 移除 `<script>`、`<iframe>`、`<form>` 等危险标签
- 移除所有 `on*` 事件属性
- 禁止 `javascript:` URL

因此普通文档 HTML（如 `example/guides/sample-page.html`）**不会执行 JavaScript**。

独立交互页在沙箱 iframe 中运行脚本，但 iframe 不同时具备 `allow-scripts` 与 `allow-same-origin`，无法读写父页 DOM 或同源存储。`localStorage` 等同源 API 可能不可用（取决于页面自身是否做了容错）。

## 不支持

- HTML frontmatter / 标签索引
- `.xhtml`、MHTML 等其它格式
- HTML → Markdown 转换或在线编辑

## 示例

- `example/guides/sample-page.html`：普通文档 HTML（大纲、内联样式、文档链接；脚本会被挡住）
- `example/guides/standalone-demo.html`：独立交互页（`html[data-theme]` + 脚本应在 iframe 中运行）
