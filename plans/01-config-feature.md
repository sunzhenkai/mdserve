# 配置功能实现计划

> 创建时间: 2026-03-18
> 状态: ✅ 已完成

## 一、需求概述

支持配置文件，配置是可选项。

### 配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 网站名称 | 显示在导航栏 | - |
| 默认文档 | 首页展示的文档 | README.md (忽略大小写) |
| 文档路径 | 文档根目录 | 命令行参数 |
| 监听地址 | Host 配置 | 127.0.0.1 |
| 监听端口 | Port 配置 | 3000 |
| Git 自动拉取 | 间隔 + 分支，启动时立即拉取一次 | 不启用 |
| 菜单配置 | 两级菜单，叶子节点支持 doc/category/tag | - |

### 配置规则

1. 可通过 `--config/-c` 参数指定配置文件路径
2. 默认读取 `.mdserve.yaml`（仅当前目录）
3. 配置优先级：命令行 > 配置文件 > 默认值
4. 指定配置文件不存在时：打印警告，使用默认配置继续
5. 非 git 仓库但配置了拉取：打印 warn 日志，不退出
6. 标签来源：Markdown 文件的 YAML Front Matter 中的 `tags` 字段

---

## 二、架构设计

### 目录结构

```
internal/
├── config/
│   ├── config.go      # 配置结构体定义和加载逻辑
│   └── config_test.go # 配置测试
├── git/
│   └── puller.go      # Git 自动拉取功能
├── tag/
│   └── indexer.go     # 标签索引（扫描 Front Matter）
└── server/
    ├── server.go      # 扩展配置支持
    └── handlers.go    # 新增配置/菜单 API
```

### 配置文件格式 (.mdserve.yaml)

```yaml
# 网站配置
site:
  name: "我的文档站"
  default_doc: "index.md"  # 可选，默认 README.md

# 服务配置
server:
  host: "127.0.0.1"
  port: 3000

# 文档路径（可选，命令行可覆盖）
docs:
  path: "./docs"

# Git 自动拉取（可选）
git:
  enabled: true
  interval: "5m"       # 拉取间隔
  branch: "main"       # 分支名称

# 菜单配置
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

---

## 三、实现步骤

### 步骤 1: 添加依赖

```bash
go get gopkg.in/yaml.v3
```

### 步骤 2: 创建配置包

**文件**: `internal/config/config.go`

- 定义 `Config` 结构体，包含所有配置项
- 实现 `DefaultConfig()` 返回默认配置
- 实现 `Load(path string)` 从文件加载配置
- 实现 `FindConfigFile(customPath string)` 查找配置文件
- 配置文件查找顺序：
  1. 如果指定了 customPath，检查该路径
  2. 否则查找当前目录的 `.mdserve.yaml` 或 `.mdserve.yml`

### 步骤 3: 扩展 CLI 入口

**文件**: `cmd/mdserve/main.go`

- 添加 `--config/-c` 参数
- `serve` 命令的 `path` 参数改为可选（可从配置文件读取）
- 实现配置合并逻辑：命令行 > 配置文件 > 默认值
- 配置文件不存在时打印警告并继续

### 步骤 4: 实现 Git 自动拉取

**文件**: `internal/git/puller.go`

- `IsGitRepo(path string) bool` - 检测是否为 git 仓库
- `NewPuller(repoPath, interval, branch)` - 创建定时拉取器
- `Start()` - 启动时立即拉取 + 定时拉取
- `Stop()` - 停止拉取
- 非 git 仓库时打印 warn 日志，不退出

### 步骤 5: 实现标签索引

**文件**: `internal/tag/indexer.go`

- 扫描所有 `.md` 文件的 Front Matter
- 提取 `tags` 字段
- 建立标签 -> 文档列表的映射
- 提供 `GetTagDocs(tag string)` 方法

### 步骤 6: 更新 Server

**文件**: `internal/server/server.go`

- 更新 `Config` 结构体引用 `config.Config`
- 添加标签索引器

**文件**: `internal/server/handlers.go`

- `GET /api/config` - 返回前端需要的配置（站点名称等）
- `GET /api/menu` - 返回菜单配置
- `GET /api/tags` - 返回所有标签及对应文档

### 步骤 7: 更新文档

**文件**: `docs/guide/configuration.md`

- 更新配置文档，添加配置文件说明

---

## 四、文件变更清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 新建 | `internal/config/config.go` | 配置结构体与加载逻辑 |
| 新建 | `internal/config/config_test.go` | 配置测试 |
| 新建 | `internal/git/puller.go` | Git 自动拉取功能 |
| 新建 | `internal/tag/indexer.go` | 标签索引 |
| 修改 | `cmd/mdserve/main.go` | 添加配置参数与加载 |
| 修改 | `internal/server/server.go` | 扩展配置、新增 API |
| 修改 | `internal/server/handlers.go` | 配置/菜单/标签 API |
| 更新 | `docs/guide/configuration.md` | 更新配置文档 |

---

## 五、API 设计

| 端点 | 方法 | 说明 | 响应示例 |
|------|------|------|----------|
| `/api/config` | GET | 返回前端配置 | `{"siteName": "xxx", "defaultDoc": "README.md"}` |
| `/api/menu` | GET | 返回菜单配置 | `[{"title": "xxx", "children": [...]}]` |
| `/api/tags` | GET | 返回所有标签 | `{"core": ["doc1.md", "doc2.md"]}` |

---

## 六、测试计划

1. **配置加载测试**
   - 默认配置正确
   - YAML 解析正确
   - 配置合并优先级正确
   - 配置文件不存在时正常处理

2. **Git 拉取测试**
   - 非 git 目录打印警告
   - git 仓库正常拉取

3. **标签索引测试**
   - Front Matter 解析正确
   - 标签映射正确

4. **集成测试**
   - 命令行参数覆盖配置文件
   - 完整启动流程
