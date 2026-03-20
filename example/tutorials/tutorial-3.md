---
title: "教程 3：高级技巧和最佳实践"
description: "掌握 mdserve 的高级使用技巧"
author: "mdserve"
date: "2026-03-20"
tags:
  - 教程
  - 高级
  - 最佳实践
categories:
  - 教程
draft: false
weight: 22
---

# 教程 3：高级技巧和最佳实践

本教程介绍 mdserve 的高级使用技巧和最佳实践。

## 文档组织最佳实践

### 目录结构

```
docs/
├── index.md                 # 首页
├── getting-started/         # 入门指南
│   ├── introduction.md
│   └── installation.md
├── guides/                  # 使用指南
│   ├── basic.md
│   └── advanced.md
├── tutorials/               # 教程
│   ├── tutorial-1.md
│   └── tutorial-2.md
├── reference/               # 参考文档
│   ├── api.md
│   └── configuration.md
└── examples/                # 示例
    └── demo.md
```

### 文件命名规范

| 规范 | 示例 | 说明 |
|------|------|------|
| 使用小写 | `getting-started.md` | ✅ 推荐 |
| 使用连字符 | `api-reference.md` | ✅ 推荐 |
| 避免空格 | ~~`getting started.md`~~ | ❌ 避免 |
| 避免特殊字符 | ~~`guide@2024.md`~~ | ❌ 避免 |

## 性能优化

### 1. 控制文件大小

```markdown
# 好的做法：拆分大文件

# 主文件：guides/main.md
主要概述和导航链接

# 子文件：guides/part-1.md, guides/part-2.md
详细内容
```

### 2. 优化图片

```markdown
<!-- 使用相对路径 -->
![图片](./images/screenshot.png)

<!-- 避免过大的图片 -->
<!-- 使用压缩后的图片 -->
```

### 3. 合理使用 Front Matter

```yaml
# 只添加必要的字段
---
title: "文档标题"
tags:
  - tag1
---

# 避免添加不必要的字段
---
title: "文档标题"
description: ""
author: ""
date: ""
# ... 很多空字段
---
```

## 常见问题解决

### 问题 1：文件不显示

检查：
- [ ] 文件扩展名是否为 `.md`
- [ ] 文件是否在服务目录内
- [ ] 文件名是否包含特殊字符

### 问题 2：实时刷新不工作

检查：
- [ ] WebSocket 连接是否正常
- [ ] 是否有文件监控权限
- [ ] 浏览器是否阻止了 WebSocket

### 问题 3：搜索不到内容

检查：
- [ ] 文件是否包含搜索关键词
- [ ] 搜索是否区分大小写
- [ ] 是否在正确的目录下搜索

## 高级配置

### 自定义端口

```bash
mdserve serve ./docs --port 8080
```

### 局域网访问

```bash
mdserve serve ./docs --host 0.0.0.0 --port 3000
```

### 后台运行

```bash
# Linux/macOS
nohup mdserve serve ./docs &

# 使用 systemd（推荐）
# 创建 systemd 服务文件
```

## 协作技巧

### 1. 版本控制

```bash
# 使用 Git 管理文档
git init
git add .
git commit -m "Initial commit"
```

### 2. 文档模板

创建文档模板 `.template.md`：

```markdown
---
title: ""
description: ""
author: ""
date: ""
tags:
  -
categories:
  -
---

# 标题

## 概述

## 正文

## 参考
```

### 3. 贡献指南

创建 `CONTRIBUTING.md`：

```markdown
# 贡献指南

## 文档规范

1. 使用统一的 Front Matter 格式
2. 遵循 Markdown 最佳实践
3. 添加适当的标签和分类

## 提交规范

- feat: 新文档
- fix: 修正错误
- docs: 文档更新
```

## 总结

### 关键要点

1. 📁 **组织结构** - 使用清晰的目录结构
2. 🏷️ **标签分类** - 合理使用标签和分类
3. ⚡ **性能** - 控制文件大小，优化图片
4. 🤝 **协作** - 使用版本控制和模板

### 下一步

现在你已经掌握了 mdserve 的基本使用方法，开始创建你自己的文档站吧！

- 探索更多 Markdown 语法
- 尝试不同的文档组织方式
- 分享你的文档站给团队

## 资源

- [Markdown 基础](../guides/markdown-basics.md)
- [Front Matter](../guides/front-matter.md)
- [高级格式化](../guides/advanced-formatting.md)
