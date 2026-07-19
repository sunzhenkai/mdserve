## Context

mdserve 当前的文档访问逻辑全部内联在 `internal/server/handlers.go` 与 `server.go` 中，作为 `*Server` 的私有方法：

- `resolveRequestPath` / `toAbsolutePath`（路径解析与穿越防护，handlers.go:63-109）
- `handleGetFile`（文件读取 + 目录 README/index.html 回退 + outline/frontmatter，handlers.go:111-211）
- `handleSearch` + `extractContext`（全文搜索，handlers.go:255-393）
- `scanDirectory`（递归目录树，server.go:276）

这些方法无法被 `server` 包之外的调用方复用（字段 `rootPath`、`ignoreMatcher`、`tagIndexer` 均为私有）。因此 MCP 层无法直接调用既有逻辑，必须先做一次纯提取重构。纯净包 `internal/markdown`、`internal/ignore`、`internal/tag` 已存在且 HTTP 无关，可直接复用。

## Goals / Non-Goals

**Goals:**
- 让 HTTP server 与 MCP server 共享同一套文档访问逻辑（零重复）。
- 提供两种 MCP 传输（stdio + Streamable HTTP），共用同一套只读工具。
- 不引入任何 Go 第三方依赖。
- 既有 HTTP API 行为完全不变（既有测试全绿即证）。

**Non-Goals:**
- 不做写入工具、不做 resources/prompts、不做鉴权。

## Decisions

### D1：MCP 协议实现 —— 手写最小实现，仅标准库
**选择**：用 Go 标准库手写 JSON-RPC 2.0 + MCP 最小子集。
**备选与放弃**：
- *官方 `modelcontextprotocol/go-sdk`*：传递依赖多、版本 churn 大；只读 5 工具收益不抵成本。
- *`mark3labs/mcp-go`*：同上，且非官方背书。
**理由**：延续本仓库"后端无新增 Go 依赖"取向（见 `add-diagram-engines` 设计）；协议面 bounded（initialize / tools/list / tools/call / ping / notifications）；可用 JSON fixture 做表驱动单测，零外部版本风险。

### D2：提取共享 `internal/docs` 服务层
**选择**：新建 `internal/docs.Library`，持有 `rootPath` + `ignoreMatcher` + `tagIndexer`，方法 `ResolvePath / AbsolutePath / ListTree / ReadDoc / Search`。`internal/server` 改为持有 `*docs.Library` 并委托。
**备选与放弃**：
- *直接在 MCP 包内重写一份逻辑*：违反 DRY，两份路径穿越防护极易漂移，安全风险高。
- *把 `*Server` 的字段导出*：暴露内部实现，破坏封装。
**理由**：路径穿越防护是安全关键逻辑，必须单一来源；提取后 HTTP 与 MCP 走同一条代码路径，既有 `handlers_test.go` 自然守护重构正确性。

### D3：工具范围 —— 只读
**选择**：仅 `list_docs` / `read_doc` / `search_docs` / `get_outline` / `list_tags`。
**理由**：mdserve 定位是文档查看器；写入会与 git 自动拉取、文件监听产生并发冲突；只读无副作用，安全默认。未来写入再扩。

### D4：传输层 —— stdio（主）+ Streamable HTTP（嵌入 serve）
**选择**：
- `mdserve mcp <path>`：stdio 行分隔 JSON-RPC，本地客户端首选，最兼容。
- `mdserve serve` 内嵌 `POST/GET/DELETE /mcp`：`POST` 同步返回（工具无状态），`GET` SSE 发 endpoint 公告后挂起，`DELETE` 确认关闭。
**备选与放弃**：
- *仅 HTTP*：远程场景好，但本地客户端需先起 web server，不如 stdio 直接。
- *仅 stdio*：失去远程/浏览器集成可能。
**理由**：用户明确要求两者都支持；共享工具实现，传输层各自薄封装，工作量可控。会话状态因工具无状态而极简（`Mcp-Session-Id` 透传，不存储）。

### D5：配置 —— `mcp.enabled` 默认 true，仅控 HTTP 端点
**选择**：`.mdserve.yaml` 新增 `mcp.enabled`（默认 true）。stdio 子命令不受影响。
**理由**：只读无副作用，默认开方便用户；提供开关满足"不想暴露 /mcp"的部署；stdio 是独立子命令，语义上与 serve 解耦。

### D6：禁用态返回 404 而非 SPA 回退
**选择**：`mcp.enabled=false` 时显式注册 `/mcp` 路由返回 404 JSON。
**理由**：`setupStaticFiles` 的 `NoRoute` 会把无扩展名路径回退到 `index.html`（200 HTML），若不显式拦截，禁用的 MCP 端点会被误判为"可用但返回 HTML"，对客户端是误导。

## Risks / Trade-offs

- **[重构 `server` 引入回归] → 既有测试守护 + 纯提取**
  重构为纯提取（逻辑搬迁不改行为），既有 `internal/server/handlers_test.go` 全绿即证无回归；分两次提交（先提取+测试绿，再加 MCP）。
- **[MCP 协议兼容性] → 最小稳定子集 + 表驱动 fixture**
  仅实现 initialize / tools/list / tools/call / ping / notifications 通知；用 JSON fixture 覆盖成功/失败/穿越；stdio 主推（最兼容），HTTP 次之。
- **[HTTP 会话复杂度] → 工具无状态，会话不存储**
  `Mcp-Session-Id` 仅 initialize 时生成并回显，不维护会话映射，避免状态膨胀与并发问题。

## Migration Plan

1. **提取 `internal/docs`**：新建 `Library`，迁移逻辑；`internal/server` 委托；既有测试绿。
2. **实现 `internal/mcp`**：协议核心 + 工具 + stdio + HTTP + 单测。
3. **CLI/配置接线**：`mcp` 子命令 + `serve` 挂载 `/mcp` + 配置项。
4. **文档**：OpenSpec 变更 + README 同步。
5. **回滚策略**：`mcp.enabled=false` 关闭 HTTP 端点；stdio 子命令不调用即不影响；`internal/docs` 提取可独立回滚（git revert 第 1 步）。

## Open Questions

- 是否需要在 `GET /mcp` SSE 流中支持客户端反向 POST？（倾向：本期不做，只读工具无需双向。）
- `mcp.enabled` 是否应区分"stdio 启停"？（倾向：否，stdio 是独立子命令，语义解耦。）
