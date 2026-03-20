---
title: "安装指南"
description: "详细了解 mdserve 的安装方法"
author: "mdserve"
date: "2026-03-20"
tags:
  - 安装
  - 部署
categories:
  - 入门
draft: false
weight: 2
---

# 安装指南

本文档将指导你完成 mdserve 的安装。

## 系统要求

在安装 mdserve 之前，请确保你的系统满足以下要求：

### 运行时要求

- Go 1.21+ （运行源码）
- 操作系统：Windows、macOS 或 Linux

### 构建要求

如需从源码构建，还需要：

- Node.js 18+
- npm 或 yarn

## 安装方法

### 方法一：下载预编译版本

访问 [GitHub Releases](https://github.com/wii/mdserve/releases) 页面，下载适合你系统的版本。

```bash
# Linux / macOS
chmod +x mdserve
sudo mv mdserve /usr/local/bin/

# Windows
# 将 mdserve.exe 移动到 PATH 目录中
```

### 方法二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/wii/mdserve.git
cd mdserve

# 构建
make build

# 可执行文件位于 bin/mdserve
```

### 方法三：使用 Go 安装

```bash
go install github.com/wii/mdserve@latest
```

## 验证安装

运行以下命令验证安装是否成功：

```bash
mdserve --version
```

## 快速启动

```bash
# 启动服务
mdserve serve /path/to/your/markdown/files

# 指定端口
mdserve serve /path/to/docs --port 8080

# 允许局域网访问
mdserve serve /path/to/docs --host 0.0.0.0
```

## 下一步

安装完成后，你可以：

- [了解 Markdown 基础](../guides/markdown-basics.md)
- [学习 Front Matter](../guides/front-matter.md)
