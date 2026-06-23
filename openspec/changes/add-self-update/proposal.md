## Why

mdserve 目前只能通过 `git clone + make build`（需 Go 1.21+ 与 Node.js 18+）或本地 `make install` 安装，没有预编译二进制分发渠道。用户必须自行构建前端 + 后端才能使用，安装门槛高，也无法便捷获取特定版本或滚动升级。需要建立 tag 触发的自动化发布管线、一键安装脚本与进程内自更新能力，让"单二进制部署"的卖点真正可用。

## What Changes

- **版本注入**：`cmd/mdserve/main.go` 新增 `Version` 变量，Makefile 通过 `-ldflags` 注入 git describe 版本号（当前构建产物显示 `dev`，无法区分版本）。
- **`mdserve version` 子命令**：输出版本号（release 构建为 tag，开发构建为 `dev` / git describe 结果）。
- **`mdserve update` 子命令**：进程内自更新——查询 GitHub Releases 最新版、下载对应平台的 tar.gz、SHA256 校验、原子替换二进制。
- **`internal/selfupdate` 包**：自更新核心逻辑（平台探测、release 查询、校验和验证、解包、安装），适配 mdserve 的二进制名与模块路径 `github.com/wii/mdserve`。
- **GitHub Actions release workflow**：push `v*` tag 时交叉编译 4 平台（linux/darwin × amd64/arm64），前端预构建嵌入二进制后打包 tar.gz + `checksums.txt`，发布到 GitHub Release；含 `-rc`/`-beta` 自动标记预发布。
- **GitHub Actions CI workflow**：push/PR 到 main 时运行 `go test ./...`。
- **`scripts/install.sh` 一键安装脚本**：检测 OS/ARCH，默认装到 `~/.local/bin`，支持 `VERSION` / `INSTALL_DIR` 环境变量与 `sudo` 安装。
- **README（中英文）**：补充 curl 一键安装、`update` 自更新章节。

## Capabilities

### New Capabilities

- `release-distribution`: tag 触发的多平台二进制构建、GitHub Release 发布、checksums 生成、一键安装脚本行为、`version` 版本查询与 `update` 进程内自更新的端到端契约。

### Modified Capabilities

（无。`navigation-menu` 与 `custom-footer` 现有 spec 不受影响。）

## Non-goals

- **不**支持 Windows：tar.gz/gzip 解包 + 自更新首版仅覆盖 linux/darwin（与参考实现一致，Windows 可后续追加 zip）。
- **不**做包管理器分发（Homebrew/apt/dnf 等）：GitHub Release + 脚本即满足主场景。
- **不**做自动后台更新检查 / 升级提醒：`update` 为用户主动触发。
- **不**做 Docker 镜像发布：当前已有 docker-compose.kroki.yml 用于图表引擎，二进制分发不引入镜像。
- **不**做 release 签名（cosign/SBOM）：首版以 SHA256 校验保证完整性。
- **不**做 ldflags 之外的构建元信息（commit hash / 构建时间）：版本号即足够。

## Impact

- **新增文件**：`internal/selfupdate/{selfupdate.go,selfupdate_test.go}`、`scripts/install.sh`、`.github/workflows/{release.yml,ci.yml}`。
- **修改文件**：`cmd/mdserve/main.go`（`Version` 变量 + `version`/`update` 子命令）、`Makefile`（ldflags 注入）、`README.md`/`README_EN.md`（安装章节）。
- **依赖**：仅 Go 标准库（net/http、archive/tar、compress/gzip、crypto/sha256），无新增第三方依赖。
- **CI**：依赖 GitHub Actions 免费额度；Release 资产托管于 GitHub Releases。
- **无破坏性变更**：现有 `serve` / `config` 命令行为不变。
