---
tags: ["README"]
---

# mdserve 文档

欢迎使用 mdserve - 一个实时 Markdown 文件服务器。

## 功能特性

- 📁 **文件浏览**: 按目录结构浏览 Markdown 文件
- 🔍 **全文搜索**: 搜索文件名和内容
- 🌓 **主题切换**: 支持亮色/暗色主题
- 📑 **目录大纲**: 自动生成文档目录
- ⚡ **实时刷新**: 文件修改后自动刷新

## 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/wii/mdserve.git

# 构建
make build

# 运行
./bin/mdserve serve /path/to/docs
```

### 使用

```bash
mdserve serve <path> [options]

Options:
  --port, -p   监听端口 (默认: 3000)
  --host       监听地址 (默认: 127.0.0.1)
```

## 目录结构

```
docs/
├── guide/
│   ├── getting-started.md
│   └── configuration.md
└── api/
    └── endpoints.md
```

## 技术栈

| 组件     | 技术                      |
| -------- | ------------------------- |
| 后端     | Go + Gin                  |
| 前端     | React + TypeScript + Vite |
| 样式     | Sass                      |
| 实时通信 | WebSocket                 |

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
