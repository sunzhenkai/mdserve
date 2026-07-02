# mdserve

[中文文档](./README.md)

A real-time Markdown file server with a web interface for browsing and rendering Markdown and HTML files.

## Features

- 📁 **File Browsing** - Browse Markdown and HTML files by directory structure
- 🔍 **Full-text Search** - Search file names and content
- 🌓 **Theme Switching** - Support for light/dark themes
- 📑 **Table of Contents** - Auto-generated document outline
- 🏷️ **Tags & Categories** - Organize documents with tags and categories
- 📊 **Diagram Engines** - Mermaid out of the box + self-hosted Kroki for d2/plantuml/graphviz and more
- ⚡ **Live Reload** - Auto-refresh browser when files are modified
- 🌐 **HTML Support** - Safely render `.html`/`.htm` documents (no JavaScript execution)
- 📦 **Single Binary Deployment** - Frontend assets embedded in binary

## Installation

### One-click install (recommended)

No Go / Node.js required — fetch the prebuilt binary via the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/sunzhenkai/mdserve/main/scripts/install.sh | bash
```

Install to a system directory (e.g. `/usr/local/bin`):

```bash
curl -fsSL https://raw.githubusercontent.com/sunzhenkai/mdserve/main/scripts/install.sh | sudo INSTALL_DIR=/usr/local/bin bash
```

Install a specific version:

```bash
VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/sunzhenkai/mdserve/main/scripts/install.sh | bash
```

> Installs to `~/.local/bin` by default; the script will print a hint if that directory is not on your `PATH`.

### Upgrade

An existing mdserve can self-update to the latest release (queries GitHub Release, downloads, verifies SHA256, atomically replaces):

```bash
mdserve update                  # upgrade to the latest stable
mdserve update --version v0.1.0 # install a specific version
mdserve update --force          # reinstall the current version
```

Show the current version:

```bash
mdserve version
```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/sunzhenkai/mdserve.git
cd mdserve

# Build
make build

# The executable is located at bin/mdserve
```

### Requirements

- Prebuilt binary: no runtime dependencies
- Building from source: Go 1.21+ and Node.js 18+ (only required for building)

## Usage

### Basic Usage

```bash
mdserve serve /path/to/markdown/files
```

After starting, visit <http://localhost:3000>

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

## Diagram Engines

mdserve supports two diagram rendering paths:

- **Mermaid** (default): rendered client-side, no configuration needed. Use a ` ```mermaid ` fenced block.
- **Kroki** (optional): via a self-hosted [Kroki](https://kroki.io) container, unlocking d2 / plantuml / graphviz / structurizr and many more DSLs.

Enable Kroki:

```bash
# Recommended: use the bundled compose (full whitelist coverage, incl. excalidraw)
docker compose -f docker-compose.kroki.yml up -d

# Or a single container (without excalidraw)
docker run -d --name kroki -p 8000:8000 yuzutech/kroki
```

Configure it in `.mdserve.yaml`:

```yaml
diagrams:
  kroki:
    enabled: true
    url: "http://localhost:8000"
```

After restarting mdserve, the startup log will show `✓ ... via Kroki [connected]`. You can then use ` ```d2 `, ` ```plantuml `, ` ```dot ` fenced blocks in Markdown.

> Aliases: `dot` → `graphviz`, `c4`/`c4model` → `structurizr`, `pu`/`puml` → `plantuml`.
> Full deployment guide: [docs/guide/diagrams.md](./docs/guide/diagrams.md).

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

| Field         | Description             |
| ------------- | ----------------------- |
| `title`       | Document title          |
| `description` | Brief description       |
| `author`      | Author name             |
| `date`        | Creation date           |
| `lastmod`     | Last modified date      |
| `tags`        | List of tags            |
| `categories`  | List of categories      |
| `draft`       | Whether it's a draft    |
| `weight`      | Sort weight             |
| `slug`        | URL-friendly identifier |

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

### POST /api/diagram

Diagram rendering proxy (requires `diagrams.kroki` enabled). Body `{engine, code}`, returns `image/svg+xml` on success.

### WS /ws

WebSocket connection for live reload

## Examples

Check out the [example](./example) directory for sample documents demonstrating all features including:

- Basic Markdown formatting
- Tags and categories
- Various document structures

## License

MIT License
