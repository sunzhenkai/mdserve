---
title: "Markdown 基础语法"
description: "学习 Markdown 的基本语法和使用方法"
author: "mdserve"
date: "2026-03-20"
tags:
  - markdown
  - 语法
  - 基础
categories:
  - 指南
draft: false
weight: 10
---

# Markdown 基础语法

Markdown 是一种轻量级标记语言，它使用简洁的语法来格式化文本。

## 标题

使用 `#` 符号来创建标题：

```markdown
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
```

## 段落和换行

段落之间使用空行分隔：

```markdown
这是第一段。

这是第二段。
```

## 强调

```markdown
*斜体* 或 _斜体_
**粗体** 或 __粗体__
***粗斜体*** 或 ___粗斜体___
```

效果：
- *斜体*
- **粗体**
- ***粗斜体***

## 列表

### 无序列表

```markdown
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2
- 项目 3
```

### 有序列表

```markdown
1. 第一项
2. 第二项
3. 第三项
```

## 链接和图片

### 链接

```markdown
[链接文本](https://example.com)
[带标题的链接](https://example.com "链接标题")
```

### 图片

```markdown
![图片替代文本](https://example.com/image.png)
![带标题的图片](https://example.com/image.png "图片标题")
```

## 代码

### 行内代码

使用反引号包裹：`code`

### 代码块

````
```javascript
function hello() {
  console.log("Hello, World!");
}
```
````

效果：

```javascript
function hello() {
  console.log("Hello, World!");
}
```

## 引用

```markdown
> 这是一段引用
> 可以包含多行
```

效果：

> 这是一段引用
> 可以包含多行

## 表格

```markdown
| 列 1 | 列 2 | 列 3 |
|------|------|------|
| 数据 | 数据 | 数据 |
| 数据 | 数据 | 数据 |
```

效果：

| 列 1 | 列 2 | 列 3 |
|------|------|------|
| 数据 | 数据 | 数据 |
| 数据 | 数据 | 数据 |

## 分隔线

```markdown
---
***
___
```

效果：

---

## 下一步

- [Front Matter 元数据](./front-matter.md) - 学习如何添加文档元数据
- [高级格式化](./advanced-formatting.md) - 学习更多高级格式化技巧
