package config

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"
)

// Config holds all configuration
type Config struct {
	Site   SiteConfig   `yaml:"site"`
	Server ServerConfig `yaml:"server"`
	Docs   DocsConfig   `yaml:"docs"`
	Git    GitConfig    `yaml:"git"`
	Menu   []MenuItem   `yaml:"menu"`
}

// SiteConfig holds site-related configuration
type SiteConfig struct {
	Name       string `yaml:"name"`
	DefaultDoc string `yaml:"default_doc"`
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

// DocsConfig holds docs-related configuration
type DocsConfig struct {
	Path   string   `yaml:"path"`
	Ignore []string `yaml:"ignore"` // Glob patterns for files/directories to ignore
}

// GitConfig holds git pull configuration
type GitConfig struct {
	Enabled  bool          `yaml:"enabled"`
	Interval time.Duration `yaml:"interval"`
	Branch   string        `yaml:"branch"`
}

// MenuItem represents a menu item
type MenuItem struct {
	Title    string     `yaml:"title"`
	Children []MenuItem `yaml:"children,omitempty"`
	// Leaf node fields
	Type string `yaml:"type,omitempty"` // doc, category, tag
	Path string `yaml:"path,omitempty"` // Document or category path
	Tag  string `yaml:"tag,omitempty"`  // Tag name (when type=tag)
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Site: SiteConfig{
			DefaultDoc: "README.md",
		},
		Server: ServerConfig{
			Host: "127.0.0.1",
			Port: 3000,
		},
		Git: GitConfig{
			Enabled:  false,
			Interval: 5 * time.Minute,
			Branch:   "main",
		},
		Menu: []MenuItem{},
	}
}

// Load loads configuration from a file
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	cfg := DefaultConfig()
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return cfg, nil
}

// FindConfigFile finds the config file to use
// Returns empty string if no config file is found
// Search order:
// 1. Custom path specified by user
// 2. In the docs path directory
// 3. In the current working directory
func FindConfigFile(customPath string, docsPath string) string {
	candidates := []string{".mdserve.yaml", ".mdserve.yml"}

	// 1. If custom path is specified, check if it exists
	if customPath != "" {
		if _, err := os.Stat(customPath); err == nil {
			absPath, _ := filepath.Abs(customPath)
			return absPath
		}
		return "" // Custom path specified but doesn't exist
	}

	// 2. Look for config files in docs path directory
	if docsPath != "" {
		absDocsPath, err := filepath.Abs(docsPath)
		if err == nil {
			for _, name := range candidates {
				configPath := filepath.Join(absDocsPath, name)
				if _, err := os.Stat(configPath); err == nil {
					return configPath
				}
			}
		}
	}

	// 3. Look for config files in current working directory
	for _, name := range candidates {
		if _, err := os.Stat(name); err == nil {
			absPath, _ := filepath.Abs(name)
			return absPath
		}
	}

	return ""
}

// MergeWithFlags merges command line flags into the config
// Command line flags take precedence over config file values
func (c *Config) MergeWithFlags(docPath string, host string, port int, hostChanged bool, portChanged bool) {
	// Document path: CLI arg takes precedence
	if docPath != "" {
		c.Docs.Path = docPath
	}

	// Host: CLI flag takes precedence if explicitly set
	if hostChanged {
		c.Server.Host = host
	}

	// Port: CLI flag takes precedence if explicitly set
	if portChanged {
		c.Server.Port = port
	}
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.Docs.Path == "" {
		return fmt.Errorf("document path is required (via command line or config file)")
	}
	return nil
}

// ExampleConfig returns an example configuration with comments
func ExampleConfig() string {
	return `# mdserve 配置文件
# 更多信息请参考: https://github.com/wii/mdserve

# 网站配置
site:
  # 网站名称，显示在导航栏
  name: "我的文档站"
  # 默认展示的文档，不配置则默认展示 README.md（忽略大小写）
  default_doc: "README.md"

# 服务配置
server:
  # 监听地址，如需局域网访问请设置为 "0.0.0.0"
  host: "127.0.0.1"
  # 监听端口
  port: 3000

# 文档路径配置（可选，命令行参数优先）
docs:
  # 文档根目录
  path: "./docs"
  # 忽略的文件或目录，支持 glob 通配符
  # 例如：
  #   - "draft/**"     忽略 draft 目录下的所有文件
  #   - "*.tmp.md"     忽略所有 .tmp.md 结尾的文件
  #   - "**/test/**"   忽略任意路径下的 test 目录
  #   - "_*"           忽略所有以下划线开头的文件/目录
  ignore: []

# Git 自动拉取配置（可选）
git:
  # 是否启用自动拉取
  enabled: false
  # 拉取间隔，支持格式：30s, 5m, 1h 等
  interval: "5m"
  # 分支名称
  branch: "main"

# 菜单配置（可选）
# 支持两级菜单结构
# 叶子节点类型:
#   - doc: 具体文档，需要指定 path
#   - category: 分类（目录），需要指定 path
#   - tag: 标签，需要指定 tag 名称
menu:
  - title: "入门指南"
    children:
      - title: "快速开始"
        type: doc
        path: "guide/getting-started.md"
      - title: "配置说明"
        type: doc
        path: "guide/configuration.md"

  - title: "API 文档"
    children:
      - title: "接口列表"
        type: category
        path: "api"
      - title: "示例代码"
        type: doc
        path: "api/examples.md"

  - title: "按标签"
    children:
      - title: "核心概念"
        type: tag
        tag: "core"
      - title: "进阶用法"
        type: tag
        tag: "advanced"
`
}
