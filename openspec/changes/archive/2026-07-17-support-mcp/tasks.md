## 1. 后端：提取共享文档层 `internal/docs`

- [x] 1.1 新建 `internal/docs/library.go`：`Library{rootPath, ignoreMatcher, tagIndexer}` + `New/RootPath/IgnoreMatcher/TagIndexer`
- [x] 1.2 迁移路径解析逻辑为 `Library.ResolvePath` / `Library.AbsolutePath`（保持 `resolveRequestPath`/`toAbsolutePath` 行为）
- [x] 1.3 迁移目录树扫描为 `Library.ListTree`（保持 `scanDirectory` 行为）
- [x] 1.4 迁移文件读取为 `Library.ReadDoc`（含 README/index.html 回退、outline、frontmatter）
- [x] 1.5 迁移全文搜索为 `Library.Search` + `extractContext`
- [x] 1.6 导出 `IsBrowsableDocument/IsSearchableDocument/DetectFileFormat/StripHTMLForSearch`
- [x] 1.7 新增 `internal/docs/errors.go`：`ErrInvalidPath/ErrAccessDenied/ErrNotFound`
- [x] 1.8 新增 `internal/docs/library_test.go`：覆盖 format 探测、HTML 剥离、读取（html/md/目录回退/README 优先）、搜索、路径穿越拒绝、树过滤

## 2. 后端：重构 `internal/server` 委托 `docs.Library`

- [x] 2.1 `server.Config` 新增 `MCPEnabled`、`Version` 字段
- [x] 2.2 `Server` 持有 `*docs.Library`；`New` 通过 `docs.New` 构建并派生 `ignoreMatcher`/`tagIndexer`
- [x] 2.3 `handlers.go` 各 handler 委托 `library.ReadDoc` / `library.Search` / `library.ResolvePath`
- [x] 2.4 `scanDirectory` 委托 `library.ListTree` + `convertFileInfos`
- [x] 2.5 保留 `detectFileFormat`/`stripHTMLForSearch` 等为 `docs.*` 薄封装（既有测试守护）
- [x] 2.6 `go test ./internal/server/...` 全绿（既有用例无回归）

## 3. 后端：MCP 协议核心 `internal/mcp`

- [x] 3.1 `protocol.go`：JSON-RPC 类型、MCP 方法常量、错误码、`Tool`/`CallToolResult`/`ContentBlock`
- [x] 3.2 `server.go`：`Server{info,tools,byName}` + `Handle/HandleBatch` + 方法分发（initialize/ping/tools-list/tools-call）
- [x] 3.3 `tools.go`：5 个只读工具 + 各自 inputSchema + handler
- [x] 3.4 `helpers.go`：`normalizeSlashes`/`splitSegments`/`filterTreeByPath`/`schema`/`toolError`
- [x] 3.5 `stdio.go`：行分隔 JSON-RPC 读写循环，支持 context 取消
- [x] 3.6 `http.go`：`HTTPHandler` + `Register`，POST/GET(SSE)/DELETE `/mcp`，initialize 回 session id
- [x] 3.7 `server_test.go`：表驱动 fixture 覆盖 initialize/tools-list/各工具调用/未知工具/缺参/穿越/通知/ping/方法未找到/解析错误

## 4. 配置 + CLI 接线

- [x] 4.1 `internal/config/config.go`：新增 `MCPConfig{Enabled bool}`（默认 true）
- [x] 4.2 `DefaultConfig` 设默认 true；`ExampleConfig` 增加 `mcp:` 块（注意反引号转义）
- [x] 4.3 `cmd/mdserve/main.go`：新增 `mcp` 子命令 `runMCP`（解析 path/config → 构建 docs.Library → stdio 循环）
- [x] 4.4 `serve`：`srvConfig` 传递 `MCPEnabled` + `Version`
- [x] 4.5 `server.setupRoutes`：启用时挂载 `/mcp`；禁用时注册 404（避免 SPA 回退误判）

## 5. 文档同步

- [x] 5.1 `README.md`：功能特性加 MCP 条目；`## 图表引擎` 后新增 `## MCP 支持`；`## API 文档` 加 `/mcp`
- [x] 5.2 `README_EN.md`：英文镜像同步
- [x] 5.3 `openspec/changes/support-mcp/`：`.openspec.yaml`/`proposal.md`/`design.md`/`tasks.md`/`specs/mcp/spec.md`
- [x] 5.4 `.mdserve.yaml` 示例配置补 `mcp:` 块（仓库根示例文件）

## 6. 端到端验证

- [x] 6.1 `go build ./...` 通过
- [x] 6.2 `go vet ./...` 通过
- [x] 6.3 `go test ./...` 全绿
- [x] 6.4 `gofmt -l` 干净
- [x] 6.5 stdio 冒烟：`mdserve mcp example` 完成 initialize + tools/list + list_docs + search_docs
- [x] 6.6 HTTP 冒烟：`mdserve serve example` → `POST /mcp` initialize（含 session header）+ tools/list + read_doc + `DELETE /mcp` 200
- [x] 6.7 `mcp.enabled=false` → `/mcp` 返回 404（非 SPA HTML 回退）
- [x] 6.8 `mdserve config init` 生成的示例含 `mcp:` 块；`mdserve --help` 列出 `mcp` 子命令
