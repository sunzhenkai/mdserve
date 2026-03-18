# 快速开始

本指南帮助你快速上手 mdserve。

## 安装

### 从源码构建

```bash
git clone https://github.com/wii/mdserve.git
cd mdserve
make build
```

### 下载预编译版本

访问 [Releases](https://github.com/wii/mdserve/releases) 页面下载适合你系统的版本。

## 基本使用

### 启动服务器

```bash
mdserve serve /path/to/your/markdown/files
```

服务器启动后，访问 http://localhost:3000 即可查看。

### 指定端口

```bash
mdserve serve /path/to/docs --port 8080
```

### 监听所有网络接口

```bash
mdserve serve /path/to/docs --host 0.0.0.0
```

## 界面说明

### 文件树

左侧显示 Markdown 文件的目录结构，点击文件即可查看。

### 搜索框

顶部搜索框可以搜索文件名和文件内容。

### 目录大纲

右侧显示当前文档的标题大纲，点击可快速跳转。

### 主题切换

右上角按钮可以切换亮色/暗色主题。

## 下一步

- [配置选项](./configuration.md)
- [API 文档](../api/endpoints.md)
