# API 端点

mdserve 提供以下 REST API 端点。

## 文件列表

获取文件树结构。

```
GET /api/files
```

### 响应

```json
{
  "files": [
    {
      "name": "docs",
      "path": "docs",
      "type": "directory",
      "children": [
        {
          "name": "README.md",
          "path": "docs/README.md",
          "type": "file"
        }
      ]
    }
  ]
}
```

## 获取文件

获取单个 Markdown 文件内容和目录大纲。

```
GET /api/file?path=<path>
```

### 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| path | string | 是 | 文件相对路径 |

### 响应

```json
{
  "content": "# Title\n\nContent...",
  "outline": [
    {
      "level": 1,
      "text": "Title",
      "slug": "title"
    }
  ]
}
```

## 搜索

搜索 Markdown 文件。

```
GET /api/search?q=<query>
```

### 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词 |

### 响应

```json
{
  "results": [
    {
      "path": "docs/README.md",
      "name": "README.md",
      "matches": ["文件名匹配", "标题: 快速开始"]
    }
  ]
}
```

## WebSocket

实时文件变更通知。

```
WS /ws
```

### 消息格式

```json
{
  "type": "reload",
  "path": "docs/README.md"
}
```

当文件被修改时，服务器会推送此消息，客户端应重新加载文件。
