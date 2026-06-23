# mdserve

[English](./README_EN.md) | 中文

一个实时 Markdown 文件服务器，提供 Web 界面浏览和渲染 Markdown 文件。

## 功能特性

- 📁 **文件浏览** - 按目录结构浏览 Markdown 文件
- 🔍 **全文搜索** - 搜索文件名和内容
- 🌓 **主题切换** - 支持亮色/暗色主题
- 📑 **目录大纲** - 自动生成文档目录
- 📊 **图表引擎** - Mermaid 开箱即用 + 自托管 Kroki 扩展 d2/plantuml/graphviz 等
- ⚡ **实时刷新** - 文件修改后自动刷新浏览器
- 📦 **单文件部署** - 前端资源嵌入二进制文件

## 安装

### 一键安装（推荐）

无需 Go / Node.js 环境，通过安装脚本拉取预编译二进制：

```bash
curl -fsSL https://raw.githubusercontent.com/wii/mdserve/main/scripts/install.sh | bash
```

安装到系统目录（如 `/usr/local/bin`）：

```bash
curl -fsSL https://raw.githubusercontent.com/wii/mdserve/main/scripts/install.sh | sudo INSTALL_DIR=/usr/local/bin bash
```

安装指定版本：

```bash
VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/wii/mdserve/main/scripts/install.sh | bash
```

> 默认安装到 `~/.local/bin`，若该目录不在 `PATH` 中，脚本会提示如何添加。

### 升级

已安装的 mdserve 可自更新到最新版本（查询 GitHub Release、下载、SHA256 校验、原子替换）：

```bash
mdserve update                  # 升级到最新正式版
mdserve update --version v0.1.0 # 安装指定版本
mdserve update --force          # 强制重装当前版本
```

查看当前版本：

```bash
mdserve version
```

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

- 预编译二进制：无运行时依赖
- 从源码构建：Go 1.21+ 与 Node.js 18+（仅构建时需要）

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

## 图表引擎

mdserve 支持 Mermaid 与 Kroki 两类图表渲染：

- **Mermaid**（默认）：在浏览器端渲染，无需任何配置。在 Markdown 中使用 ` ```mermaid ` 代码块即可。
- **Kroki**（可选）：通过自托管 [Kroki](https://kroki.io) 容器，解锁 d2 / plantuml / graphviz / structurizr 等数十种 DSL。

启用 Kroki：

```bash
# 推荐：用仓库自带的 compose（完整覆盖白名单，含 excalidraw）
docker compose -f docker-compose.kroki.yml up -d

# 或单容器（不含 excalidraw）
docker run -d --name kroki -p 8000:8000 yuzutech/kroki
```

在 `.mdserve.yaml` 中配置：

```yaml
diagrams:
  kroki:
    enabled: true
    url: "http://localhost:8000"
```

重启 mdserve 后，启动日志会显示 `✓ ... via Kroki [已连接]`。随后在 Markdown 中即可使用 ` ```d2 `、` ```plantuml `、` ```dot ` 等代码块。

> 别名兼容：`dot` → `graphviz`、`c4`/`c4model` → `structurizr`、`pu`/`puml` → `plantuml`。
> 完整部署指南见 [docs/guide/diagrams.md](./docs/guide/diagrams.md)。

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

### POST /api/diagram
图表渲染代理（需启用 `diagrams.kroki`）。请求体 `{engine, code}`，成功返回 `image/svg+xml`。

### WS /ws
WebSocket 连接，用于实时刷新

## 许可证

MIT License
