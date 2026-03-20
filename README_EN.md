# mdserve

[中文文档](./README.md)

A real-time Markdown file server with a web interface for browsing and rendering Markdown files.

## Features

- 📁 **File Browsing** - Browse Markdown files by directory structure
- 🔍 **Full-text Search** - Search file names and content
- 🌓 **Theme Switching** - Support for light/dark themes
- 📑 **Table of Contents** - Auto-generated document outline
- 🏷️ **Tags & Categories** - Organize documents with tags and categories
- ⚡ **Live Reload** - Auto-refresh browser when files are modified
- 📦 **Single Binary Deployment** - Frontend assets embedded in binary

## Installation

### Build from Source

```bash
# Clone the repository
git clone https://github.com/wii/mdserve.git
cd mdserve

# Build
make build

# The executable is located at bin/mdserve
```

### Requirements

- Go 1.21+
- Node.js 18+ (only required for building)

## Usage

### Basic Usage

```bash
mdserve serve /path/to/markdown/files
```

After starting, visit http://localhost:3000

### Command Line Options

```bash
mdserve serve <path> [flags]

Flags:
  --port, -p int    Port to listen on (default 3000)
  --host string     Host to bind to (default 127.0.0.1)
  --help, -h        Show help information
```

### Examples

```bash
# Local development
mdserve serve ./docs

# Custom port
mdserve serve ./docs --port 8080

# LAN access
mdserve serve ./docs --host 0.0.0.0
```

## Document Metadata (Front Matter)

You can add metadata to your Markdown files using YAML front matter:

```yaml
---
title: "Document Title"
description: "A brief description"
author: "Author Name"
date: "2026-03-20"
tags:
  - tag1
  - tag2
categories:
  - Category1
  - Category2
draft: false
---
```

### Supported Metadata Fields

| Field | Description |
|-------|-------------|
| `title` | Document title |
| `description` | Brief description |
| `author` | Author name |
| `date` | Creation date |
| `lastmod` | Last modified date |
| `tags` | List of tags |
| `categories` | List of categories |
| `draft` | Whether it's a draft |
| `weight` | Sort weight |
| `slug` | URL-friendly identifier |

## Development

### Development Mode

```bash
# Install dependencies
make install

# Run development server
make dev
```

### Frontend Development

```bash
cd web
npm install
npm run dev
```

The frontend dev server will automatically proxy API requests to the backend.

### Building

```bash
# Build everything
make build

# Build frontend only
make build-frontend

# Build backend only
make build-backend

# Cross-platform build
make build-all
```

## Tech Stack

### Backend
- Go
- Gin (Web Framework)
- fsnotify (File Watcher)
- gorilla/websocket
- goldmark (Markdown Parser)

### Frontend
- React 18
- TypeScript
- Vite
- Sass
- react-markdown

## API Documentation

### GET /api/files
Get file tree structure

### GET /api/file?path=<path>
Get single file content and outline

### GET /api/search?q=<query>
Search Markdown files

### WS /ws
WebSocket connection for live reload

## Examples

Check out the [example](./example) directory for sample documents demonstrating all features including:
- Basic Markdown formatting
- Tags and categories
- Various document structures

## License

MIT License
