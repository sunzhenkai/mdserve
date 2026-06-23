## 1. 版本注入基础

- [x] 1.1 在 `cmd/mdserve/main.go` 新增 `var Version = "dev"` 变量（package main）
- [x] 1.2 修改 `Makefile`：定义 `VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)` 与 `LDFLAGS`，在 `build-backend`/`build-all`/`install` 目标注入 `-X main.Version=$(VERSION)`（实现时发现 `cmd/mdserve/main.go` 为 package main，ldflags 符号须用 `main.Version` 而非完整 import 路径）
- [x] 1.3 验证 `make build && ./bin/mdserve version` 能输出版本号（本地构建输出 `dev` 或 git describe 结果）

## 2. version 子命令

- [x] 2.1 在 `cmd/mdserve/main.go` 新增 `versionCmd`：`Use: "version"`、`Short: "Print the version of mdserve"`，输出 `Version` 变量（纯版本号一行）
- [x] 2.2 在 `main()` 中 `rootCmd.AddCommand(versionCmd)`
- [x] 2.3 手动验证：`./bin/mdserve version` / `./bin/mdserve --help` 列出 version 子命令

## 3. selfupdate 包（核心）

- [x] 3.1 创建 `internal/selfupdate/selfupdate.go`：定义 `DefaultRepo = "wii/mdserve"`、`Options`/`Result` 结构体
- [x] 3.2 实现 `DetectPlatform()`：linux/darwin + amd64/arm64，其余返回明确错误
- [x] 3.3 实现 `FetchLatestRelease(repo, client)`：调 GitHub `/releases/latest`，解析 `tag_name`
- [x] 3.4 实现版本比较：`normalizeVersion` 去 `v` 前缀、`isUpToDate`（`dev`/空 视为非最新）
- [x] 3.5 实现下载（`downloadFile`）、SHA256 校验（`verifyChecksum` 读 `checksums.txt`）、tar.gz 解包（`extractBinary`，匹配 `mdserve` 二进制名）
- [x] 3.6 实现原子安装（`installBinary`：探测可写 → 写 `.new` → `chmod 0755` → `os.Rename` 覆盖）
- [x] 3.7 实现 `Update(opts)` 主流程：探测平台 → 查/定目标版本 → 已最新则跳过 → 下载校验解包安装 → 返回 `Result`
- [x] 3.8 创建 `internal/selfupdate/selfupdate_test.go`：用 `httptest` mock release，覆盖平台探测、版本比较、已最新、完整安装、checksum mismatch、解包缺失二进制、默认/自定义安装目录、下载

## 4. update 子命令

- [x] 4.1 在 `cmd/mdserve/main.go` 新增 `updateCmd`：`Use: "update"`、`Short` 描述下载安装最新 release
- [x] 4.2 注册 flags：`--version`(默认 latest)、`--install-dir`(默认空→`~/.local/bin`)、`--force`、`--repo`(默认 `selfupdate.DefaultRepo`)
- [x] 4.3 实现 `RunE`：调 `selfupdate.Update`，传入 `Current: Version`、`Out: cmd.OutOrStdout()`；已最新返回 nil；成功后提示重启
- [x] 4.4 `rootCmd.AddCommand(updateCmd)`，`mdserve --help` 验证

## 5. install.sh 一键安装脚本

- [x] 5.1 创建 `scripts/install.sh`（`set -euo pipefail`）：定义 `REPO=wii/mdserve`、`VERSION=latest`、`INSTALL_DIR=$HOME/.local/bin` 环境变量默认值
- [x] 5.2 实现 `detect_os`/`detect_arch`（Linux/Darwin + x86_64/aarch64/arm64）、`need_cmd`（curl/tar）
- [x] 5.3 实现 `resolve_tag`：latest 时调 GitHub API 取 `tag_name`，否则用 `VERSION`
- [x] 5.4 实现下载资产 + `checksums.txt`、`verify_checksum`（兼容 sha256sum/shasum）
- [x] 5.5 实现权限处理（`mkdir -p` / 不可写给 sudo 提示）、`install -m 755` 到目标目录
- [x] 5.6 实现 PATH 提示：安装后检测 `INSTALL_DIR` 是否在 `PATH`，未在则输出 `export PATH=...` 引导
- [x] 5.7 `chmod +x scripts/install.sh`，本地自测：`bash -n` 语法检查 + helper 函数（detect_os/arch/path_contains_dir）+ 用本地 mock HTTP server 完整跑通 download→checksum→extract→install→run 流程（真实 GitHub 安装留待 9.2 首个 release 后）

## 6. GitHub Actions release workflow

- [x] 6.1 创建 `.github/workflows/release.yml`：触发条件 `on: push: tags: ['v*']`
- [x] 6.2 添加 go test 守门步骤（`go test ./...`，失败即中止）
- [x] 6.3 添加前端构建步骤：setup-node 18 + `cd web && npm ci && npm run build`
- [x] 6.4 实现 4 平台循环构建：`CGO_ENABLED=0 GOOS/GOARCH go build` 注入 `-X main.Version=${TAG}` ldflags，`tar -czf mdserve_{tag}_{os}_{arch}.tar.gz mdserve`（实现时改用 `read -r os arch` 拆分平台对，比 `set --` 更稳健）
- [x] 6.5 生成 `checksums.txt`（`sha256sum *.tar.gz`）
- [x] 6.6 用 `softprops/action-gh-release` 上传所有资产 + checksums，`prerelease` 由 tag 是否含 `-rc`/`-beta` 决定
- [x] 6.7 本地完整模拟：用 workflow 等价的交叉编译逻辑产出 4 个 tar.gz + checksums.txt，验证资产命名、tar 内仅含 `mdserve`、checksums 格式、解压后 `mdserve version` 正常、内嵌前端可启动（真实 GitHub Actions 运行留待首个 tag push）

## 7. GitHub Actions CI workflow

- [x] 7.1 创建 `.github/workflows/ci.yml`：`on: push: branches:[main]` + `pull_request: branches:[main]`
- [x] 7.2 单 job：ubuntu-latest + go 1.21 + `go vet ./...` + `go test ./...`
- [ ] 7.3 验证：创建测试 PR 或观察下次 push 触发 CI（需推送后由 GitHub 触发，本会话无法执行）

## 8. 文档更新

- [x] 8.1 更新 `README.md` 安装章节：新增"一键安装"curl 命令、`INSTALL_DIR=/usr/local/bin` 示例、指定版本安装、`mdserve update` 升级说明、`mdserve version` 说明
- [x] 8.2 更新 `README_EN.md`：同步英文版安装与升级章节
- [x] 8.3 更新 `Makefile` 顶部注释（说明 ldflags 版本注入与 `main.Version` 符号，已在 1.2 完成）

## 9. 端到端验证

> 9.1–9.5 需要真实 GitHub Release（推送 tag 触发 workflow、GitHub 托管资产），须由用户在合并后执行，本会话无法自动化。Go 层自更新逻辑已由 `internal/selfupdate` 的 httptest 单测覆盖；install.sh + workflow 产物的兼容性已由本地 mock HTTP 端到端跑通。

- [ ] 9.1 推送首个 `v0.1.0-rc.1` tag 触发 release，确认 4 个 tar.gz + checksums.txt 上传、标记为 prerelease
- [ ] 9.2 在 linux 与 macOS（amd64 或 arm64）上执行 `curl | bash` 验证安装、`mdserve version` 输出 rc.1
- [ ] 9.3 执行 `mdserve update --force` 验证自更新全流程（查询、下载、校验、安装、版本刷新）
- [ ] 9.4 验证已最新场景：`mdserve update` 输出 "already up to date" 且不下载
- [ ] 9.5 推送正式 `v0.1.0` tag，确认未标记为 prerelease；老版本执行 `mdserve update` 升级到正式版
- [x] 9.6 验证发布产物内嵌前端：本地用交叉编译产物（与 release.yml 等价逻辑产出）启动 `mdserve serve .`，curl 确认返回 React `<title>mdserve - Markdown Server</title>` 与 `<div id="root">`（非"裸后端"）；真实 Release 后建议再走查一次
