# HTML 文档支持

mdserve 除 Markdown 外，还支持在 Web 界面中浏览 `.html` / `.htm` 文件。

## 基本用法

将 HTML 文件放入文档目录即可，文件树会自动收录。点击文件后在应用壳层（侧栏、大纲、工具栏）内渲染正文。

## 目录索引

访问目录路径时，默认文档查找顺序为：

1. `README.md`（大小写不敏感）
2. `index.html` / `index.htm`（大小写不敏感）

## 资源与链接

- 相对路径的 `<img>`、`<link rel="stylesheet">` 会通过 `/api/asset` 解析
- 指向 `.md` / `.html` 的相对链接在 SPA 内导航，不会整页刷新
- 外链（`http(s)://`）在新标签页打开

## 安全限制

HTML 渲染前会经 DOMPurify 净化：

- 移除 `<script>`、`<iframe>`、`<form>` 等危险标签
- 移除所有 `on*` 事件属性
- 禁止 `javascript:` URL

**HTML 文档不会执行 JavaScript。** 若需交互页面，请使用外部静态托管。

## 不支持

- HTML frontmatter / 标签索引
- `.xhtml`、MHTML 等其它格式
- HTML → Markdown 转换或在线编辑

## 示例

仓库 `example/guides/sample-page.html` 提供了含大纲、内联样式与文档链接的示例页面。
