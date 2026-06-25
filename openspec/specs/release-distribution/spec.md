# release-distribution Specification

## Purpose
TBD - created by archiving change add-self-update. Update Purpose after archive.
## Requirements
### Requirement: Tag-triggered release workflow

系统 SHALL 在 push 匹配 `v*` 模式的 git tag 时，自动触发 GitHub Actions release workflow，先运行测试、构建前端并嵌入二进制、交叉编译多平台产物，最终发布到 GitHub Release。

#### Scenario: Stable tag triggers release
- **WHEN** 用户 push tag `v0.1.0` 到远程仓库
- **THEN** release workflow SHALL 自动运行测试，测试通过后构建并创建 GitHub Release 且上传构建产物

#### Scenario: Pre-release tag marked as prerelease
- **WHEN** 用户 push tag `v0.1.0-rc.1` 或 `v0.1.0-beta.1`
- **THEN** 创建的 GitHub Release SHALL 标记为 prerelease

#### Scenario: Stable tag not marked as prerelease
- **WHEN** 用户 push tag `v0.1.0`（不含 `-rc` 或 `-beta`）
- **THEN** 创建的 GitHub Release SHALL NOT 标记为 prerelease

### Requirement: Multi-platform binary builds with embedded frontend

release workflow SHALL 在构建后端二进制前先编译前端（`npm install && npm run build`），使前端资源嵌入二进制，并为以下 4 个平台交叉编译 `mdserve` 二进制：

- `linux/amd64`
- `linux/arm64`
- `darwin/amd64`
- `darwin/arm64`

所有构建 SHALL 使用 `CGO_ENABLED=0` 以保证纯静态交叉编译。

#### Scenario: Linux amd64 build embeds frontend
- **WHEN** release workflow 执行 linux/amd64 构建
- **THEN** SHALL 产出包含嵌入前端资源的可执行 `mdserve` 二进制并打包为 tar.gz

#### Scenario: Darwin arm64 build embeds frontend
- **WHEN** release workflow 执行 darwin/arm64 构建
- **THEN** SHALL 产出包含嵌入前端资源的可执行 `mdserve` 二进制并打包为 tar.gz

#### Scenario: Build runs only after tests pass
- **WHEN** release workflow 被 tag 触发
- **THEN** SHALL 先运行 `go test ./...`，测试失败时 SHALL 中止发布流程

### Requirement: Release artifact naming

每个平台的发布资产 SHALL 使用命名格式 `mdserve_{version}_{os}_{arch}.tar.gz`，其中 `version` 为完整 tag 名（含 `v` 前缀），`os` 为 `linux` 或 `darwin`，`arch` 为 `amd64` 或 `arm64`。tar.gz 内 SHALL 仅包含单个名为 `mdserve` 的可执行文件。

#### Scenario: Asset name for linux arm64
- **WHEN** tag 为 `v0.1.0`，构建 `linux/arm64` 平台
- **THEN** 资产文件名 SHALL 为 `mdserve_v0.1.0_linux_arm64.tar.gz`

#### Scenario: Archive contains single binary
- **WHEN** 用户解压任意平台的 tar.gz
- **THEN** SHALL 得到名为 `mdserve` 的单个可执行文件

### Requirement: Checksums file

release workflow SHALL 生成 `checksums.txt` 文件，包含所有 tar.gz 发布资产的 sha256 校验和，并作为 Release 资产一并上传。

#### Scenario: Checksums included in release
- **WHEN** release workflow 完成所有平台构建
- **THEN** GitHub Release SHALL 包含 `checksums.txt`，且其中以 `<sha256>  <filename>` 格式列出每个 tar.gz 的 sha256 值

### Requirement: Install script

系统 SHALL 提供 `scripts/install.sh` 一键安装脚本，支持从 GitHub Release 下载并安装 mdserve 二进制。

#### Scenario: Default install to user directory
- **WHEN** 用户执行 `curl -fsSL .../install.sh | bash` 且未设置 `INSTALL_DIR`
- **THEN** 脚本 SHALL 将 `mdserve` 安装到 `~/.local/bin`

#### Scenario: Install to system directory
- **WHEN** 用户执行 `sudo INSTALL_DIR=/usr/local/bin bash install.sh`
- **THEN** 脚本 SHALL 将 `mdserve` 安装到 `/usr/local/bin`

#### Scenario: Install specific version
- **WHEN** 用户设置 `VERSION=v0.1.0-rc.1` 后执行安装脚本
- **THEN** 脚本 SHALL 下载并安装该 tag 对应的二进制

#### Scenario: Install latest stable
- **WHEN** 用户未设置 `VERSION`（默认 `latest`）
- **THEN** 脚本 SHALL 从 GitHub `/releases/latest` 获取最新正式 release 并安装

#### Scenario: Verify checksum on install
- **WHEN** 安装脚本下载二进制资产
- **THEN** SHALL 下载 `checksums.txt` 并用其校验下载文件的 sha256，校验失败时以非零退出码退出

#### Scenario: Unsupported platform rejected
- **WHEN** 用户在非 linux/darwin 操作系统或非 amd64/arm64 架构上执行安装脚本
- **THEN** 脚本 SHALL 以非零退出码退出并输出错误信息

#### Scenario: PATH hint after install
- **WHEN** 安装完成且 `INSTALL_DIR` 不在用户 PATH 中
- **THEN** 脚本 SHALL 输出提示信息，告知用户如何将 `INSTALL_DIR` 加入 PATH

### Requirement: Version subcommand

系统 SHALL 提供 `mdserve version` 子命令，输出当前二进制的版本号。

#### Scenario: Show embedded version on release build
- **WHEN** 用户执行由 release workflow 构建的 `mdserve version`
- **THEN** 系统 SHALL 输出对应的 git tag 版本号

#### Scenario: Show dev version on local build
- **WHEN** 用户执行本地 `make build` 构建的 `mdserve version`
- **THEN** 系统 SHALL 输出 `dev` 或 `git describe` 结果

### Requirement: In-place self-update command

系统 SHALL 提供 `mdserve update` 子命令，从 GitHub Releases 下载匹配当前平台的 release 资产并替换正在使用的二进制。

#### Scenario: Update to latest version
- **WHEN** 用户执行 `mdserve update`（未指定 `--version`）
- **THEN** 命令 SHALL 查询 GitHub Releases 最新正式版本，下载对应平台资产并安装

#### Scenario: Already up to date
- **WHEN** 用户执行 `mdserve update` 且当前版本已等于最新版本
- **THEN** 命令 SHALL 输出"已是最新版本"提示且不执行下载

#### Scenario: Update specific version
- **WHEN** 用户执行 `mdserve update --version v0.1.2`
- **THEN** 命令 SHALL 安装指定 tag 对应的二进制

#### Scenario: Force reinstall same version
- **WHEN** 用户执行 `mdserve update --force`
- **THEN** 命令 SHALL 即使当前版本等于目标版本也重新下载并安装

#### Scenario: Custom install directory
- **WHEN** 用户执行 `mdserve update --install-dir /usr/local/bin`
- **THEN** 命令 SHALL 将二进制安装到指定目录

#### Scenario: Verify checksum on update
- **WHEN** `update` 子命令下载 release 资产
- **THEN** SHALL 下载 `checksums.txt` 并校验资产 sha256，校验失败时中止并返回错误

#### Scenario: Unsupported platform rejected
- **WHEN** 用户在非 linux/darwin 操作系统或非 amd64/arm64 架构上执行 `mdserve update`
- **THEN** 命令 SHALL 返回明确错误，不执行下载

### Requirement: CI test workflow

系统 SHALL 提供 GitHub Actions CI workflow，在 push 和针对 main 分支的 pull request 时运行 `go test ./...`。

#### Scenario: Tests run on pull request
- **WHEN** 用户创建针对 main 的 pull request
- **THEN** CI workflow SHALL 运行 `go test ./...` 并在失败时阻断合并

