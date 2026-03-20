---
title: "Front Matter 元数据"
description: "学习如何使用 YAML Front Matter 添加文档元数据"
author: "mdserve"
date: "2026-03-20"
tags:
  - front-matter
  - yaml
  - 元数据
categories:
  - 指南
draft: false
weight: 11
---

# Front Matter 元数据

Front Matter 是位于 Markdown 文件顶部的 YAML 元数据块，用于定义文档的各种属性。

## 基本语法

Front Matter 必须位于文件的最开始，使用 `---` 包围：

```yaml
---
title: "文档标题"
description: "文档描述"
author: "作者名"
date: "2026-03-20"
---
```

## 支持的字段

| 字段 | 类型 | 描述 |
|------|------|------|
| `title` | string | 文档标题 |
| `description` | string | 简短描述 |
| `author` | string | 作者名称 |
| `date` | string | 创建日期 |
| `lastmod` | string | 最后修改日期 |
| `tags` | array | 标签列表 |
| `categories` | array | 分类列表 |
| `draft` | boolean | 是否为草稿 |
| `weight` | number | 排序权重 |
| `slug` | string | URL 友好标识符 |

## 标签 (Tags)

标签用于标记文档的关键词：

```yaml
---
tags:
  - javascript
  - react
  - frontend
---
```

或者使用行内格式：

```yaml
---
tags: ["javascript", "react", "frontend"]
---
```

## 分类 (Categories)

分类用于组织文档的层级结构：

```yaml
---
categories:
  - 前端开发
  - JavaScript
---
```

## 完整示例

```yaml
---
title: "React Hooks 入门指南"
description: "详细介绍 React Hooks 的基本概念和使用方法"
author: "张三"
date: "2026-03-20"
lastmod: "2026-03-20"
tags:
  - react
  - hooks
  - javascript
categories:
  - 前端开发
  - React
draft: false
weight: 10
slug: "react-hooks-guide"
---

# React Hooks 入门指南

文档内容从这里开始...
```

## 最佳实践

### 1. 保持简洁

只添加必要的元数据字段：

```yaml
---
title: "文档标题"
tags:
  - tag1
  - tag2
---
```

### 2. 标签命名规范

- 使用小写字母
- 使用连字符分隔单词
- 保持一致性

```yaml
# 好的例子
tags:
  - react-hooks
  - typescript

# 不好的例子
tags:
  - React Hooks
  - TypeScript
```

### 3. 分类层级

保持分类结构清晰：

```yaml
categories:
  - 编程
  - 前端
  - React
```

## 下一步

- [高级格式化](./advanced-formatting.md) - 学习更多格式化技巧
