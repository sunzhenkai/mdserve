# 配置选项

mdserve 支持通过命令行参数和配置文件进行配置。

## 快速开始

使用 `config init` 命令快速生成示例配置文件：

```bash
# 在当前目录生成 .mdserve.yaml
mdserve config init

# 指定输出文件名
mdserve config init my-config.yaml

# 强制覆盖已存在的文件
mdserve config init --force
```

## 命令行参数

| 参数 | 简写 | 默认值 | 说明 |
|------|------|--------|------|
| `--config` | `-c` | `.mdserve.yaml` | 配置文件路径 |
| `--port` | `-p` | 3000 | 服务器监听端口 |
| `--host` | `-H` | 127.0.0.1 | 服务器监听地址 |

## 配置文件

mdserve 支持使用 YAML 格式的配置文件。默认会在当前目录查找 `.mdserve.yaml` 或 `.mdserve.yml` 文件。

### 配置文件示例

```yaml
# 网站配置
site:
  name: "我的文档站"        # 网站名称，显示在导航栏
  default_doc: "index.md"  # 默认展示的文档，默认为 README.md

# 服务配置
server:
  host: "127.0.0.1"        # 监听地址
  port: 3000               # 监听端口

# 文档路径（可选，命令行参数优先）
docs:
  path: "./docs"

# Git 自动拉取（可选）
git:
  enabled: true            # 是否启用自动拉取
  interval: "5m"           # 拉取间隔，支持格式：5m, 1h, 30s 等
  branch: "main"           # 分支名称

# 菜单配置（可选）
menu:
  - title: "入门指南"
    children:
      - title: "快速开始"
        type: doc
        path: "guide/getting-started"
      - title: "配置说明"
        type: doc
        path: "guide/configuration"
  - title: "按分类"
    children:
      - title: "API 文档"
        type: category
        path: "api"
  - title: "按标签"
    children:
      - title: "核心概念"
        type: tag
        tag: "core"
```

### 配置项说明

#### site（网站配置）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | string | - | 网站名称，显示在导航栏 |
| `default_doc` | string | README.md | 默认展示的文档路径（忽略大小写） |

#### server（服务配置）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `host` | string | 127.0.0.1 | 监听地址 |
| `port` | int | 3000 | 监听端口 |

#### docs（文档配置）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `path` | string | - | 文档根目录路径 |

#### git（Git 配置）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | bool | false | 是否启用自动拉取 |
| `interval` | duration | 5m | 拉取间隔 |
| `branch` | string | main | 分支名称 |

> **注意**：如果配置了 Git 自动拉取但文档目录不是 Git 仓库，程序会打印警告日志但不会退出。

#### menu（菜单配置）

菜单支持两级结构，叶子节点可以是以下类型：

| type | 说明 | 必需字段 |
|------|------|----------|
| `doc` | 具体文档 | `path` |
| `category` | 分类（目录） | `path` |
| `tag` | 标签 | `tag` |

## 配置优先级

配置的优先级从高到低：

1. **命令行参数** - 最高优先级
2. **配置文件**
3. **默认值** - 最低优先级

## 示例

### 使用配置文件

```bash
# 使用默认配置文件 (.mdserve.yaml)
mdserve serve

# 指定配置文件
mdserve serve -c ./config/prod.yaml

# 命令行参数覆盖配置文件
mdserve serve -c ./config/prod.yaml --port 8080
```

### 仅使用命令行参数

```bash
# 本地开发
mdserve serve ./docs

# 局域网访问
mdserve serve ./docs --host 0.0.0.0

# 自定义端口
mdserve serve ./docs -p 8080

# 生产环境
mdserve serve ./docs --host 0.0.0.0 --port 80
```

## 标签功能

mdserve 支持从 Markdown 文件的 YAML Front Matter 中提取标签：

```markdown
---
tags:
  - core
  - getting-started
---

# 快速开始

文档内容...
```

标签可以在菜单中使用 `type: tag` 来引用，系统会自动列出所有包含该标签的文档。

## 注意事项

- 默认只监听本地回环地址 (127.0.0.1)
- 如需外部访问，请设置 `--host 0.0.0.0`
- 确保防火墙开放相应端口
- Git 自动拉取使用 `--ff-only` 模式，避免自动合并冲突
