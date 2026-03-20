---
title: "教程 2：使用标签和分类"
description: "学习如何有效地使用标签和分类来组织文档"
author: "mdserve"
date: "2026-03-20"
tags:
  - 教程
  - 标签
  - 分类
categories:
  - 教程
draft: false
weight: 21
---

# 教程 2：使用标签和分类

本教程将教你如何使用标签和分类来组织文档。

## 理解标签和分类

### 标签 (Tags)

标签是描述文档内容的**关键词**，用于标记文档的主题。

特点：
- 可以有多个
- 用于描述内容特征
- 便于搜索和过滤

### 分类 (Categories)

分类是文档的**层级组织**方式，用于构建文档结构。

特点：
- 可以有层级关系
- 用于组织文档架构
- 便于导航和浏览

## 设计你的标签体系

### 常见标签类型

| 类型 | 示例 |
|------|------|
| 技术栈 | `react`, `vue`, `nodejs` |
| 主题 | `tutorial`, `guide`, `reference` |
| 难度 | `beginner`, `intermediate`, `advanced` |
| 状态 | `draft`, `published`, `deprecated` |

### 标签命名规范

```yaml
# 推荐：使用小写和连字符
tags:
  - getting-started
  - best-practices
  - troubleshooting

# 不推荐
tags:
  - Getting Started
  - Best_Practices
  - Troubleshooting!
```

## 设计你的分类体系

### 分类示例

```
文档站
├── 入门
│   ├── 介绍
│   └── 安装
├── 指南
│   ├── 基础
│   └── 高级
└── 参考
    ├── API
    └── 配置
```

## 实践练习

### 练习 1：技术文档

创建一个技术文档：

```yaml
---
title: "React 组件开发指南"
tags:
  - react
  - components
  - frontend
categories:
  - 开发指南
  - React
---

# React 组件开发指南

文档内容...
```

### 练习 2：教程文档

创建一个教程文档：

```yaml
---
title: "5 分钟学会 React Hooks"
tags:
  - tutorial
  - react-hooks
  - beginner
categories:
  - 教程
  - React
---

# 5 分钟学会 React Hooks

教程内容...
```

### 练习 3：参考文档

创建一个参考文档：

```yaml
---
title: "API 参考手册"
tags:
  - reference
  - api
  - documentation
categories:
  - 参考
  - API
---

# API 参考手册

参考内容...
```

## 最佳实践

### 1. 保持一致性

在整个文档站中使用统一的标签和分类命名。

### 2. 不要过度分类

```yaml
# 太多标签
tags:
  - tag1
  - tag2
  - tag3
  - tag4
  - tag5
  - tag6

# 合适数量
tags:
  - important-tag1
  - important-tag2
```

### 3. 定期整理

定期审查和整理标签，合并相似的标签。

## 下一步

- [教程 3：高级技巧](./tutorial-3.md)
