# mcp Specification

## Purpose
TBD - created by archiving change support-mcp. Update Purpose after archive.
## Requirements
### Requirement: MCP 配置

系统 SHALL 通过 `.mdserve.yaml` 的 `mcp` 配置项控制 Streamable HTTP 端点的启停。配置 MUST 满足以下 schema：

```yaml
mcp:
  enabled: boolean   # 默认 true；是否在 serve 中挂载 /mcp HTTP 端点
```

`mdserve mcp` stdio 子命令 MUST NOT 受此开关影响，始终可用。

所有暴露的工具 MUST 为只读（无写入、无删除、无副作用）。

#### Scenario: 配置启用（默认）
- **WHEN** `.mdserve.yaml` 中无 `mcp` 配置或 `mcp.enabled = true`
- **THEN** `mdserve serve` MUST 在 `/mcp` 挂载 Streamable HTTP 端点
- **AND** `mdserve mcp <path>` 子命令 MUST 始终可用

#### Scenario: 配置禁用
- **WHEN** `.mdserve.yaml` 中 `mcp.enabled = false`
- **THEN** `mdserve serve` MUST NOT 挂载 `/mcp` HTTP 端点
- **AND** 对 `/mcp` 的请求 MUST 返回 HTTP 404（不可被 SPA 路由回退为 200 HTML）
- **AND** `mdserve mcp <path>` 子命令 MUST 仍然可用

---

### Requirement: stdio 传输子命令

系统 SHALL 提供 `mdserve mcp <path>` 子命令，通过 stdio（stdin 读、stdout 写）以行分隔 JSON-RPC 2.0 消息交换 MCP 协议。

子命令 MUST 仅消费 `docs.path` 与 `docs.ignore` 配置项；web/git/diagrams 配置 MUST 被忽略。

日志 MUST 输出到 stderr，stdout MUST 仅承载协议消息（任何非协议输出会破坏客户端解析）。

#### Scenario: 基本握手
- **WHEN** 客户端向 stdin 发送 `initialize` 请求
- **THEN** stdout MUST 返回 JSON-RPC 响应，包含 `protocolVersion`、声明 `tools` capability 的 `capabilities`、`serverInfo`
- **AND** `serverInfo.name` MUST 为 `"mdserve"`

#### Scenario: 通知不产生响应
- **WHEN** 客户端发送 `notifications/initialized` 通知（无 `id`）
- **THEN** 服务端 MUST NOT 向 stdout 写入任何响应

#### Scenario: 客户端关闭 stdin
- **WHEN** stdin 到达 EOF
- **THEN** 子命令 MUST 干净退出（退出码 0）

---

### Requirement: Streamable HTTP 传输端点

系统 SHALL 在 `mdserve serve`（且 `mcp.enabled != false`）时挂载 `/mcp` 端点，实现 Streamable HTTP 传输：

- `POST /mcp`：接收单个 JSON-RPC 请求或批处理，返回对应 JSON-RPC 响应；纯通知请求 MUST 返回 HTTP 202 且无响应体。
- `GET /mcp`：以 `text/event-stream` 打开 SSE 流；MUST 至少发送一个 `event: endpoint` 公告事件；服务端无主动通知时连接 MUST 挂起直到客户端断开。
- `DELETE /mcp`：MUST 返回 HTTP 200 确认会话终止。

`POST /mcp` 处理 `initialize` 请求时 MUST 在响应头返回 `Mcp-Session-Id`。

#### Scenario: POST initialize
- **WHEN** 客户端 `POST /mcp` 发送 `initialize` 请求，`Content-Type: application/json`
- **THEN** 响应 MUST 为 HTTP 200，body 为 JSON-RPC initialize 结果
- **AND** 响应头 MUST 包含 `Mcp-Session-Id`

#### Scenario: POST 纯通知
- **WHEN** 客户端 `POST /mcp` 发送仅含通知的批处理
- **THEN** 响应 MUST 为 HTTP 202，且 body 为空

#### Scenario: 非 JSON Content-Type
- **WHEN** 客户端 `POST /mcp` 的 `Content-Type` 不含 `json`
- **THEN** 响应 MUST 为 HTTP 415

#### Scenario: DELETE 会话
- **WHEN** 客户端 `DELETE /mcp`
- **THEN** 响应 MUST 为 HTTP 200，无 body

---

### Requirement: 只读工具集

系统 SHALL 暴露以下只读工具，全部通过 `tools/list` 声明、经 `tools/call` 调用，且共享同一套底层文档访问逻辑（`internal/docs.Library`）：

| 工具 | 入参 | 行为 |
|---|---|---|
| `list_docs` | 可选 `path`（子目录） | 返回可浏览文档树（markdown + html，遵循 ignore 规则） |
| `read_doc` | 必填 `path` | 读取单个文档；目录回退 README.md → index.html；markdown 剥离 front matter |
| `search_docs` | 必填 `query` | 全文搜索（文件名 + 标题 + 行内容），最多 50 条 |
| `get_outline` | 必填 `path` | 返回 markdown 标题大纲；html 返回空列表 |
| `list_tags` | 无 | 返回 front matter 提取的 tags 与 categories 及其文档映射 |

每个工具 MUST 在 `tools/list` 中声明 `inputSchema`（JSON Schema），必填参数 MUST 列入 `required`。

#### Scenario: tools/list 声明全部工具
- **WHEN** 客户端调用 `tools/list`
- **THEN** 结果 MUST 包含 `list_docs`、`read_doc`、`search_docs`、`get_outline`、`list_tags` 五个工具
- **AND** 每个工具 MUST 包含 `name`、`description`、`inputSchema`

#### Scenario: read_doc 成功
- **WHEN** 客户端调用 `read_doc` 传入存在的文档路径
- **THEN** 结果 MUST 为 `content` 数组，含一条 `type: "text"` 块
- **AND** 文本 MUST 为 JSON，含 `path`、`format`、`content` 字段

#### Scenario: read_doc 目录回退
- **WHEN** 客户端调用 `read_doc` 传入目录路径，且该目录含 `README.md`
- **THEN** 返回的 `path` MUST 指向 `README.md`（而非 index.html）

#### Scenario: search_docs 无匹配
- **WHEN** 客户端调用 `search_docs` 传入无任何匹配的 query
- **THEN** 结果的 `content[0].text` MUST 表明无匹配（非空数组、非错误）

---

### Requirement: 工具参数校验与错误约定

系统 SHALL 对工具调用做入参校验：

- 缺失必填参数 MUST 返回 JSON-RPC 错误，`code` 为 `-32602`（invalid params），`message` 指明缺失参数名。
- 调用未知工具 MUST 返回 JSON-RPC 错误，`code` 为 `-32601`（method not found）。
- 文档不存在或被 ignore MUST 作为工具结果返回（`isError: true`，content 为文本说明），而非 JSON-RPC 错误，以保留调用上下文。

#### Scenario: 缺失必填参数
- **WHEN** 客户端调用 `read_doc` 不传 `path`
- **THEN** 响应 MUST 为 JSON-RPC 错误，`code = -32602`，`message` 含 `path`

#### Scenario: 调用未知工具
- **WHEN** 客户端调用 `tools/call`，`name` 为不存在的工具
- **THEN** 响应 MUST 为 JSON-RPC 错误，`code = -32601`

#### Scenario: 读取不存在文档
- **WHEN** 客户端调用 `read_doc` 传入不存在的路径
- **THEN** 响应 MUST 为成功 JSON-RPC（无 `error`）
- **AND** `result.isError` MUST 为 `true`
- **AND** `result.content[0].text` MUST 描述失败原因

---

### Requirement: 路径穿越防护

系统 MUST 对所有接受路径参数的工具（`read_doc`、`get_outline`）及 HTTP `/api/file`、`/api/asset` 端点实施一致的路径穿越防护：

- 任何包含 `..` 且解析后超出文档根的路径 MUST 被拒绝。
- 防护逻辑 MUST 单一来源（`internal/docs.Library`），HTTP 与 MCP 共享，不得重复实现。

#### Scenario: 工具拒绝穿越
- **WHEN** 客户端调用 `read_doc`，`path` 为 `../../../etc/passwd`
- **THEN** 系统 MUST NOT 读取文档根之外的文件
- **AND** 结果 MUST 为错误（JSON-RPC 错误或 `isError: true` 工具结果），不泄漏文件内容

#### Scenario: HTTP 端点拒绝穿越
- **WHEN** 客户端请求 `/api/file?path=../../etc/passwd`
- **THEN** 响应 MUST 为 HTTP 403（access denied），不返回文件内容

---

### Requirement: 协议健壮性

系统 SHALL 对畸形输入做健壮处理：

- 无效 JSON MUST 返回 JSON-RPC 解析错误（`code = -32700`）。
- 未知方法 MUST 返回 `method not found`（`code = -32601`）。
- `ping` 请求 MUST 返回空结果（用于连接保活）。
- 纯通知批处理 MUST 不产生响应（stdio 无输出 / HTTP 202）。

#### Scenario: 无效 JSON
- **WHEN** 客户端发送非 JSON 文本
- **THEN** 响应 MUST 为 JSON-RPC 错误，`code = -32700`

#### Scenario: 未知方法
- **WHEN** 客户端发送方法名不在支持列表内的请求
- **THEN** 响应 MUST 为 JSON-RPC 错误，`code = -32601`

#### Scenario: ping 保活
- **WHEN** 客户端发送 `ping` 请求
- **THEN** 响应 MUST 为成功，`result` 为空对象
