## ADDED Requirements

### Requirement: 文件树服务端内存缓存

系统 SHALL 在服务进程内维护与可浏览文档扫描语义一致的文件树内存缓存。缓存 MUST 在服务启动时构建；当文件监听检测到目录结构变更时，系统 MUST 更新该缓存（允许短时 debounce）。`GET /api/files` 在无特殊失败情况下 MUST 基于该缓存返回结果，而 MUST NOT 在每次请求时无缓存地全量递归扫盘。

#### Scenario: 启动后重复请求命中缓存

- **WHEN** 服务已完成首次文件树构建，客户端连续两次请求无参 `GET /api/files`
- **THEN** 两次响应的可浏览树内容 MUST 一致，且第二次请求 MUST NOT 触发完整目录树重新扫描作为唯一数据源（应以缓存为准）

#### Scenario: 目录变更后缓存更新

- **WHEN** 文档根下新增或删除可浏览文档/目录，且文件监听发出树变更通知
- **THEN** 系统 MUST 更新内存缓存，随后 `GET /api/files` MUST 反映变更后的树

### Requirement: 无参接口保持全量树兼容

无查询参数的 `GET /api/files` SHALL 继续返回 docs 根下完整可浏览文件树（受 ignore 与隐藏文件规则约束），JSON 形状与现有客户端约定兼容（含 `files` 数组及目录 `children`）。

#### Scenario: 无参请求返回完整树

- **WHEN** 客户端请求 `GET /api/files` 且不带 `path`/`depth` 参数
- **THEN** 响应 MUST 包含从根开始的完整可浏览树

### Requirement: 支持按目录分级按需读取

系统 SHALL 支持通过查询参数按目录浅层读取文件树，至少包括：

- `path`：相对 docs 根的目录路径；省略时表示根
- `depth`：返回深度；当 `depth=1` 时 MUST 仅返回该目录的直接子节点（文件节点无 `children`；目录节点可不含深层 `children`，或仅含空/省略的子级以表示未展开）

按需读取的过滤语义（ignore、隐藏文件、空目录省略、HTML/Markdown 可浏览规则）MUST 与全量树一致。

#### Scenario: 根目录浅层列表

- **WHEN** 客户端请求 `GET /api/files?depth=1`（或不带 `path` 且 `depth=1`）
- **THEN** 响应 MUST 仅包含根目录直接子节点，MUST NOT 要求客户端解析整棵深层树才能渲染首层

#### Scenario: 展开子目录

- **WHEN** 客户端请求 `GET /api/files?path=<dir>&depth=1` 且 `<dir>` 为存在的可浏览目录
- **THEN** 响应 MUST 仅包含该目录的直接子节点

### Requirement: Web UI 默认按需加载文件树

Web 文件树 SHALL 默认采用分级按需加载：首屏加载根层节点；用户展开某目录时再加载该目录子节点。当 URL 或当前文档路径指向深层文件时，系统 MUST 预取并展开其父路径链上所需的目录层，以便节点可见与定位。

收到 WebSocket `tree_reload` 后，Web UI MUST 使已缓存的树查询失效并重新获取，以与服务端更新后的树一致。

#### Scenario: 大库首屏只加载根层

- **WHEN** 用户打开 Web UI 且文档库含大量嵌套文件
- **THEN** 首屏文件树请求 MUST 使用浅层（按需）方式，页面 MUST NOT 因等待整棵全量树而长时间停留在不可交互状态（在网络与磁盘正常前提下）

#### Scenario: 深链打开文档展开父路径

- **WHEN** 用户通过带 `path` 的 URL 打开深层文档
- **THEN** 文件树 MUST 加载并展开该文档的父目录链，使当前文档节点可被展示与定位

#### Scenario: tree_reload 后刷新

- **WHEN** 前端收到 `tree_reload` 消息
- **THEN** 前端 MUST 重新获取文件树数据（按当前按需策略），界面 MUST 反映服务端最新树结构
