## Why

mdserve 当前的所有文档访问逻辑（路径解析、目录树扫描、文件读取、全文搜索）都内联在 `internal/server` 的 HTTP handler 中，无法被非 HTTP 客户端复用。AI 编程客户端（Claude / Cursor / ZCode 等）普遍采用 MCP（Model Context Protocol）接入外部知识源，用户希望让 AI 直接浏览、检索 mdserve 托管的文档库，而不必复制文件或手写搜索 prompt。

## What Changes

- **新增共享文档层 `internal/docs`**：把原 `*Server` 私有的路径解析（防穿越）、目录树扫描、文件读取、全文搜索逻辑提取为纯逻辑层 `Library`，供 HTTP server 与 MCP server 共享，行为不变。
- **新增 MCP 协议实现 `internal/mcp`**：手写 JSON-RPC 2.0 + MCP 最小子集（initialize / notifications/initialized / tools/list / tools/call / ping），仅用标准库，零新增 Go 依赖。
- **双传输**：
  - `mdserve mcp <path>` 子命令 —— stdio 传输，本地 AI 客户端直连，始终可用。
  - `mdserve serve` 内嵌 Streamable HTTP 端点 `POST/GET/DELETE /mcp`，受 `mcp.enabled` 控制。
- **只读工具集**：`list_docs` / `read_doc` / `search_docs` / `get_outline` / `list_tags`，全部无副作用。
- **配置**：`.mdserve.yaml` 新增 `mcp.enabled`（默认 true），仅控制 HTTP 端点；stdio 子命令不受影响。
- **禁用态明确**：`mcp.enabled=false` 时 `/mcp` 返回 404，避免被 SPA NoRoute 回退成 index.html 误判为可用。

## Capabilities

### New Capabilities
- `mcp`：Model Context Protocol 接入能力——stdio 子命令、Streamable HTTP 端点、只读工具集、配置开关、路径安全契约的端到端定义。

### Modified Capabilities
- 无。文档访问逻辑从 `internal/server` 提取到 `internal/docs` 是内部重构，对外 API（`/api/files`、`/api/file`、`/api/search`、`/api/tags`）行为不变。

## Non-goals

- **不**提供写入工具（write_doc / create_doc / delete_doc）：mdserve 定位是文档查看器，写入会与 git 自动拉取、文件监听产生并发冲突，本期不做。
- **不**引入官方 MCP Go SDK 或第三方 MCP 库：保持"后端无新增 Go 依赖"的既有取向，只读 5 工具用手写最小实现即可覆盖。
- **不**实现 MCP resources / prompts / sampling 能力：本期只做 tools。
- **不**支持鉴权 / TLS / 远程多租户：stdio 本地信任，HTTP 端点与现有 `/api/*` 同等信任边界（默认仅监听 127.0.0.1）。
- **不**做 SSE 服务端推送通知：只读工具无服务端事件，`GET /mcp` 仅发送 endpoint 公告事件后挂起。

## Impact

- **后端**：新增 `internal/docs`（提取层）与 `internal/mcp`（协议 + 两种传输）；`internal/server` 改为委托 `docs.Library`，`/mcp` 路由按配置挂载或返回 404。
- **CLI**：`cmd/mdserve/main.go` 新增 `mcp` 子命令；`serve` 传递 `MCPEnabled` + `Version`。
- **配置**：`.mdserve.yaml` 新增 `mcp.enabled`；`config init` 示例同步。
- **依赖**：无新增 Go 依赖（`go.mod` 不变）。
- **文档**：README（中/英）新增 MCP 章节、功能特性条目、`/mcp` API 说明。
- **测试**：`internal/docs`、`internal/mcp` 表驱动单测覆盖工具成功/失败/路径穿越；既有 `internal/server` 测试保证重构无回归。
