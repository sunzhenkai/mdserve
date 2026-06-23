## Context

mdserve 当前的安装与版本管理现状：

- **安装方式单一**：仅 `git clone + make build`，要求用户本机具备 Go 1.21+ 与 Node.js 18+（前端构建）。`make install` 只是把本地构建产物拷到 `~/.local/bin`。
- **无版本号概念**：`cmd/mdserve/main.go` 没有 `Version` 变量，二进制构建产物全部是匿名"dev"，无法区分版本。
- **无发布管线**：仓库无 `.github/workflows`，无 GitHub Release，无 checksums，没有预编译二进制。
- **命令结构**：`main.go`（package main）内联定义 cobra 命令（`serve` / `config init`），没有独立 `cmd` 包。

参考实现（同作者 `sunzhenkai/grepom`）已验证一套成熟方案：`selfupdate` 包 + `update` 子命令 + `scripts/install.sh` + GitHub Actions release/ci workflow。本变更新增同类能力，但需适配 mdserve 的两个关键差异：

1. **二进制内嵌前端**：mdserve 的卖点是"单二进制部署"——前端 React 资源在构建时 embed 进二进制。release 流程必须 `make build-frontend` 后再 `go build`，否则发布出的是"裸后端"。
2. **模块路径与二进制名**：模块 `github.com/wii/mdserve`、二进制名 `mdserve`、默认 repo `wii/mdserve`，与 grepom 的 `sunzhenkai/grepom` 不同。

## Goals / Non-Goals

**Goals:**
- 让用户无需 Go/Node 即可安装：`curl | bash` 一键拉取预编译二进制。
- 让已安装用户一键升级：`mdserve update` 进程内自更新，含校验和。
- 让版本可追溯：`mdserve version` + ldflags 注入。
- 让发布自动化：push tag → CI 构建 4 平台 → 发布 Release + checksums。
- 保持"单二进制"卖点：发布产物是内嵌前端的一个二进制。

**Non-Goals:**
- 不支持 Windows（首版仅 linux/darwin × amd64/arm64）。
- 不做包管理器分发（Homebrew/apt/Scoop 等）。
- 不做 Docker 镜像发布。
- 不做 release 签名（cosign）/ SBOM。
- 不做后台自动检查更新。
- 不做 commit hash / 构建时间等额外构建元信息。

## Decisions

### D1：版本注入——ldflags 写入 main 包 Version 变量

**选择**：在 `cmd/mdserve/main.go` 新增 `var Version = "dev"`，Makefile 与 release workflow 通过 `-ldflags "-X github.com/wii/mdserve/cmd/mdserve.Version=$(VERSION)"` 注入 `git describe --tags --always --dirty` 结果。

**备选方案与放弃理由**：
- *`runtime/debug.ReadBuildInfo()`*：需 `go build` 默认保留 VCS 信息，且 tag→version 映射不如 ldflags 直观可控。
- *单独 version 包*：main.go 目前是单文件内联命令，独立包增加跳转成本，收益不大。

**理由**：与 grepom 一致、行为可预期、CI 与本地 make 共用同一套 ldflags。`Version` 定义在 main 包，子命令闭包可直接引用。

### D2：selfupdate 包——移植 grepom 实现并改适配常量

**选择**：新建 `internal/selfupdate/selfupdate.go`，结构与 grepom 等价（`Options`/`Result`/`Update`/`DetectPlatform`/`FetchLatestRelease`/校验和解压/原子安装），但改三处常量：

- `DefaultRepo = "wii/mdserve"`
- 二进制名 `mdserve`（解包时匹配 `hdr.Name == "mdserve"`、安装目标名 `mdserve`、资产名 `mdserve_{tag}_{os}_{arch}.tar.gz`）
- 默认安装目录 `~/.local/bin`（保持不变）

**理由**：grepom 实现已含完整单测（httptest mock release / checksum mismatch / 平台探测），移植后改名即用，质量可继承。放 `internal/` 避免外部导入。

**备选方案与放弃理由**：
- *引入 `github.com/minio/selfupdate` 第三方库*：增加依赖，且其 API 不直接对接 GitHub Release 命名约定，需再包一层；标准库 net/http + archive/tar 已足够。
- *调用系统 `curl | tar`*：跨平台一致性差，无法做 SHA256 校验链。

### D3：release workflow——前端预构建 + CGO_ENABLED=0 交叉编译

**选择**：`.github/workflows/release.yml` 在单个 ubuntu runner 上完成全流程：

1. `go test ./...`（守门）。
2. `cd web && npm ci && npm run build`（前端产物落入 `internal/server/static/` 或等价 embed 目录）。
3. 对 4 个目标平台循环：`CGO_ENABLED=0 GOOS/GOARCH go build -ldflags "-X ...Version=$(TAG)" -o mdserve ./cmd/mdserve`，`tar -czf mdserve_{tag}_{os}_{arch}.tar.gz mdserve`。
4. `sha256sum *.tar.gz > checksums.txt`。
5. `softprops/action-gh-release` 上传资产，`prerelease: ${{ contains(tag, '-rc') || contains(tag, '-beta') }}`。

**关键点**：前端只构建一次，产物被 `go build` 通过 `//go:embed` 一次性嵌入所有 4 个平台的二进制。无需在 4 个平台上各装 Node。

**备选方案与放弃理由**：
- *goreleaser*：mdserve 是嵌入前端的混合构建，goreleaser 的 `before.hooks` 能跑 npm，但其与 `go:embed` 路径约定的配合需额外配置；首版用裸 bash workflow 更透明、可调试，且与 grepom 已验证方案一致。
- *在 4 个目标平台上分别构建*：macOS runner 需付费且慢；交叉编译一个 linux runner 全搞定更快更省。

### D4：原子二进制替换——写 `.new` 再 rename

**选择**：`installBinary` 下载解包到临时目录 → 复制到 `dest + ".new"` 并 `chmod 0755` → `os.Rename` 覆盖 `dest`。安装前先写测试文件探测目录可写性，失败给"try sudo or --install-dir"提示。

**理由**：`rename` 在同一文件系统内是原子的，避免半覆盖状态；windows 上 rename 覆盖运行中二进制会失败，但首版不支持 windows，无碍。

### D5：install.sh——移植 grepom 脚本并改名

**选择**：`scripts/install.sh` 移植 grepom 版本（`set -euo pipefail`、detect_os/arch、resolve_tag via GitHub API、curl 下载、sha256sum/shasum 兼容、PATH 提示），把 `grepom` 全改为 `mdserve`、`REPO` 默认 `wii/mdserve`。

**理由**：脚本已覆盖 macOS（shasum）与 Linux（sha256sum）差异、权限友好提示、自定义版本/目录，行为成熟。

### D6：CI workflow——最小化 go test

**选择**：`.github/workflows/ci.yml` 在 push/PR 到 main 时 `go test ./...`，单 ubuntu + go 1.21。不跑前端测试（前端无测试套件，且 release workflow 已守门）。

### D7：Windows 不支持——明确报错而非静默

**选择**：`DetectPlatform` 与 `install.sh` 对非 linux/darwin 直接返回明确错误。windows 用户引导至 `make build` 本地构建。

**理由**：windows 自更新涉及"运行中 exe 替换"复杂度（需 rename + 重启），首版范围之外，明确报错优于半成品。

## Risks / Trade-offs

- **[前端构建失败导致 release 空壳] → release workflow 前端步骤 `set -e` + 测试守门**
  若 `npm run build` 失败，workflow 立即中止，不会产出无前端的"裸后端"二进制。

- **[GitHub API 限流（自更新查询 latest）] → 未鉴权请求有 60 次/小时上限**
  对个人工具足够；若未来量级上升，可加 `GITHUB_TOKEN` 环境变量支持，首版不做。

- **[下载中断导致半包安装] → SHA256 校验兜底**
  下载后先校验 checksums.txt 再解包安装，校验失败不触碰目标二进制。

- **[替换正在运行的 mdserve 二进制] → linux/darwin 允许覆盖运行中文件**
  rename 覆盖运行中二进制在 linux/darwin 安全（旧 inode 保留至进程退出）。已安装后提示用户重启进程。

- **[交叉编译缺少 CGO 依赖] → CGO_ENABLED=0**
  mdserve 仅用纯 Go 库（gin/fsnotify/websocket/cobra），无 cgo 依赖，静态编译无副作用。gin 在 CGO_ENABLED=0 下运行正常（sonic 等 JIT 在纯 Go 回退路径下工作）。

- **[tag 误触发 release] → 需人工确认 tag]**
  release 由人工 push tag 触发，非自动；误推可用 `git push --delete` + 删 Release 回滚。

## Migration Plan

本变更新增能力，无破坏性改动。用户迁移路径：

1. **升级 mdserve**：首次发布后，老用户（源码构建者）`make build` 即获得 `version`/`update` 命令。
2. **新用户一键安装**：`curl -fsSL https://raw.githubusercontent.com/wii/mdserve/main/scripts/install.sh | bash`。
3. **后续升级**：`mdserve update`。

**回滚策略**：删除新增的 `.github/workflows`、`scripts/install.sh`、`internal/selfupdate/`，恢复 `main.go` 与 Makefile 即可。已发布的 GitHub Release 资产可手动删除，不影响运行中的二进制。

## Open Questions

实施时需在以下细节做工程决策（不影响契约）：

- `version` 子命令输出格式：纯版本号一行，还是含 `mdserve <version>` 前缀？（倾向纯版本号，便于脚本解析，与 grepom 一致）
- release workflow 是否在 Release Notes 里自动附带 CHANGELOG / commit log？（倾向首版用自动生成 commit log）
- `update` 子命令是否在更新成功后提示"新版本需重启正在运行的 serve 进程"？（倾向是，已在 spec 隐含）
