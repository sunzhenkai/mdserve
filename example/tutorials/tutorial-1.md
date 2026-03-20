---
title: "教程 1：创建你的第一个文档"
description: "学习如何使用 mdserve 创建和组织文档"
author: "mdserve"
date: "2026-03-20"
tags:
  - 教程
  - 入门
  - 文档
categories:
  - 教程
draft: false
weight: 20
---

# 教程 1：创建你的第一个文档

本教程将指导你创建第一个 mdserve 文档。

## 准备工作

确保你已经：

1. ✅ 安装了 mdserve
2. ✅ 创建了一个文档目录

## 步骤 1：创建目录结构

```bash
mkdir -p my-docs/guides
mkdir -p my-docs/tutorials
```

## 步骤 2：创建首页

在 `my-docs` 目录下创建 `index.md`：

```markdown
# 我的文档

欢迎来到我的文档站！

## 目录

- [指南](./guides/)
- [教程](./tutorials/)
```

## 步骤 3：添加文档

在 `guides` 目录下创建 `getting-started.md`：

```markdown
---
title: "快速开始"
tags:
  - 入门
categories:
  - 指南
---

# 快速开始

这是快速开始指南...
```

## 步骤 4：启动服务器

```bash
mdserve serve my-docs
```

## 步骤 5：查看效果

打开浏览器访问 http://localhost:3000

## 练习

1. 创建一个新的 Markdown 文件
2. 添加标签和分类
3. 使用不同的 Markdown 语法
4. 观察实时刷新效果

## 下一步

- [教程 2：使用标签和分类](./tutorial-2.md)
