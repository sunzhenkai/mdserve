# 图表引擎部署指南

mdserve 支持两类图表渲染：**Mermaid**（浏览器端，开箱即用）与 **Kroki**（服务端代理，支持数十种 DSL）。

- Mermaid 无需任何配置，使用 ` ```mermaid ` 代码块即可。
- Kroki 需要自托管容器，本文档介绍其部署与配置方法。

> 为什么使用自托管 Kroki？Kroki 统一封装了 d2 / PlantUML / Graphviz 等引擎（多数依赖 JVM 或外部运行时），mdserve 通过代理 + 缓存的方式接入，既保留「单二进制部署」的简洁，又把渲染计算放在你的内网，不联网调外部 SaaS。

## 1. 启动 Kroki 容器

### 方式 A：用仓库自带的 docker compose（推荐）

仓库根目录提供 `docker-compose.kroki.yml`，已覆盖 mdserve 全部白名单引擎（含 excalidraw companion）：

```bash
docker compose -f docker-compose.kroki.yml up -d
```

停止：`docker compose -f docker-compose.kroki.yml down`

### 方式 B：单容器 docker run（不含 excalidraw）

如果只需要 d2 / plantuml / graphviz / structurizr 等内置引擎（不含 excalidraw），可用单镜像：

```bash
docker run -d --name kroki \
  -p 8000:8000 \
  --restart unless-stopped \
  yuzutech/kroki
```

启动后访问 `http://localhost:8000` 应返回 200。

> PlantUML / Structurizr 等引擎首次调用会冷启动 JVM，可能需要数秒。mdserve 会缓存渲染结果，**只慢一次**。
>
> 为什么 compose 版多一个 excalidraw 容器？`yuzutech/kroki` 主镜像内置了 d2 / plantuml / graphviz / blockdiag 系列等引擎，但 excalidraw 需要独立的 companion 容器。compose 文件已处理好网关与 companion 的连接，开箱即用覆盖完整白名单。

## 2. 配置 mdserve

在 `.mdserve.yaml` 中添加：

```yaml
diagrams:
  kroki:
    enabled: true
    url: "http://localhost:8000"  # Kroki 容器根 URL
    timeout: "10s"                 # 可选，默认 10s
    cache_version: 1               # 可选，默认 1
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | bool | `false` | 是否启用 Kroki 渲染通路 |
| `url` | string | （必填） | Kroki 容器根 URL |
| `timeout` | duration | `10s` | 调用 Kroki 的超时时间 |
| `cache_version` | int | `1` | 缓存版本号，变更后失效全部缓存 |

启动 mdserve，日志会显示：

```
图表引擎:
  ✓ mermaid (客户端渲染)
  ✓ actdiag / blockdiag / d2 / erd / excalidraw / graphviz / ... via Kroki @ http://localhost:8000 [已连接]
```

## 3. 在 Markdown 中使用

任意受支持引擎的代码块都会自动渲染：

````markdown
```d2
x -> y: hello
y -> z: world
```
````

### 别名

以下语言标签会自动归一化：

| 输入别名 | 归一化引擎 |
|---|---|
| `dot` | `graphviz` |
| `c4`、`c4model` | `structurizr` |
| `pu`、`puml` | `plantuml` |

### 受支持的引擎清单

`d2`、`plantuml`、`structurizr`、`graphviz`、`excalidraw`、`wavedrom`、`nomnoml`、`bytefield`、`erd`、`pikchr`、`svgbob`、`blockdiag`、`actdiag`、`seqdiag`、`nwdiag`

> 想看实际效果？打开 `example/guides/diagram-engines.md`。

## 4. 缓存

渲染成功的 SVG 会以内容寻址的方式缓存到磁盘：

```
<工作目录>/.mdserve/cache/diagrams/<cache_version>/<engine>/<sha256(code)>.svg
```

- 同一源码只会调用 Kroki 一次，之后直接读缓存。
- 修改源码（哪怕一个字符）→ `sha256` 变化 → 视为新条目，重新渲染。
- Kroki 升级导致输出变化时，把 `cache_version` 加 1 即可让全部缓存失效。
- 缓存目录可随时手动删除，无副作用。

## 5. 错误反馈

当渲染出问题时，UI 会给出差异化提示：

| 状态 | 触发条件 | UI 表现 |
|------|----------|---------|
| 未配置 Kroki | `enabled: false` 或未配置 | 警告图标 + `docker run` 命令 + yaml 配置示例 + 折叠源码 |
| 服务不可达 / 超时 | 容器未启动 / 网络不通 | 错误图标 + `docker ps \| grep kroki` 排查提示 + 折叠源码 |
| DSL 语法错误 | Kroki 返回 4xx | 错误图标 + 具体错误消息 + **默认展开**源码 |
| 不支持的引擎 | 引擎不在白名单 | 提示 + 受支持引擎列表 + 源码 |

## 6. 安全提示

- **PlantUML `!include` 指令**：Kroki 默认禁用了 PlantUML 读取本地文件的能力。如你在不可信环境部署，请确认保留该默认（详见 Kroki 安全文档）。
- **不联网调外部服务**：mdserve 只与你在 `.mdserve.yaml` 中配置的 `url` 通信，不会向 kroki.io 发送数据。
- **请求体上限**：单个图表请求体上限 1 MiB，防止意外的大请求。

## 7. 关闭与回滚

删除 `.mdserve.yaml` 中的 `diagrams.kroki` 配置（或设为 `enabled: false`）即关闭服务端通路，回到纯 Mermaid 状态。Mermaid 渲染行为不受影响。

缓存目录可手动删除：

```bash
rm -rf <工作目录>/.mdserve/cache/diagrams
```
