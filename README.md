# mdserve

[English](./README_EN.md) | 中文

一个实时 Markdown 文件服务器，提供 Web 界面浏览和渲染 Markdown 文件。

## 功能特性

- 📁 **文件浏览** - 按目录结构浏览 Markdown 文件
- 🔍 **全文搜索** - 搜索文件名和内容
- 🌓 **主题切换** - 支持亮色/暗色主题
- 📑 **目录大纲** - 自动生成文档目录
- ⚡ **实时刷新** - 文件修改后自动刷新浏览器
- 📦 **单文件部署** - 前端资源嵌入二进制文件

## 安装

### 从源码构建

```bash
# 克隆项目
git clone https://github.com/wii/mdserve.git
cd mdserve

# 构建
make build

# 可执行文件位于 bin/mdserve
```

### 依赖

- Go 1.21+
- Node.js 18+ (仅构建时需要)

## 使用

### 基本用法

```bash
mdserve serve /path/to/markdown/files
```

启动后访问 http://localhost:3000

### 命令行参数

```bash
mdserve serve <path> [flags]

Flags:
  --port, -p int    监听端口 (默认 3000)
  --host string     监听地址 (默认 127.0.0.1)
  --help, -h        帮助信息
```

### 示例

```bash
# 本地开发
mdserve serve ./docs

# 自定义端口
mdserve serve ./docs --port 8080

# 局域网访问
mdserve serve ./docs --host 0.0.0.0
```

## 开发

### 开发模式

```bash
# 安装依赖
make install

# 运行开发服务器
make dev
```

### 前端开发

```bash
cd web
npm install
npm run dev
```

前端开发服务器会自动代理 API 请求到后端。

### 构建

```bash
# 构建所有
make build

# 仅构建前端
make build-frontend

# 仅构建后端
make build-backend

# 跨平台构建
make build-all
```

## 技术栈

### 后端
- Go
- Gin (Web 框架)
- fsnotify (文件监控)
- gorilla/websocket
- goldmark (Markdown 解析)

### 前端
- React 18
- TypeScript
- Vite
- Sass
- react-markdown

## API 文档

### GET /api/files
获取文件树结构

### GET /api/file?path=<path>
获取单个文件内容和目录大纲

### GET /api/search?q=<query>
搜索 Markdown 文件

### WS /ws
WebSocket 连接，用于实时刷新

## 许可证

MIT License
