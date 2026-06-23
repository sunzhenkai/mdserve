.PHONY: all build build-frontend build-backend clean install deps run test

# Version is injected at build time via -ldflags. Falls back to "dev" when no
# git tag is present (e.g. fresh clone before first release). The symbol is
# "main.Version" because cmd/mdserve/main.go is package main.
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -ldflags "-X main.Version=$(VERSION)"

# Default target
all: build

# Build everything (frontend + backend)
build: build-frontend build-backend

# Build frontend
build-frontend:
	@echo "Building frontend..."
	cd web && npm install && npm run build
	@echo "Frontend built successfully!"

# Build backend
build-backend:
	@echo "Building backend..."
	go build $(LDFLAGS) -o bin/mdserve ./cmd/mdserve
	@echo "Backend built successfully!"

# Install frontend dependencies
deps-frontend:
	cd web && npm install

# Install all dependencies
deps: deps-frontend
	go mod download

# Install binary to ~/.local/bin
install: build
	@echo "Installing mdserve to ~/.local/bin..."
	@mkdir -p ~/.local/bin
	@cp bin/mdserve ~/.local/bin/
	@echo "Installation complete! Make sure ~/.local/bin is in your PATH."

# Run in development mode (with hot reload)
dev:
	@echo "Starting development server..."
	@go run ./cmd/mdserve serve . --host 127.0.0.1 --port 3000

# Run the built binary
run:
	./bin/mdserve serve . --host 127.0.0.1 --port 3000

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf internal/server/static/

# Run tests
test:
	go test -v ./...

# Build for multiple platforms
build-all: build-frontend
	@echo "Building for multiple platforms..."
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o bin/mdserve-linux-amd64 ./cmd/mdserve
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o bin/mdserve-darwin-amd64 ./cmd/mdserve
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o bin/mdserve-darwin-arm64 ./cmd/mdserve
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o bin/mdserve-windows-amd64.exe ./cmd/mdserve
	@echo "Multi-platform build complete!"

# Development with frontend watch
dev-full:
	@echo "Starting development environment..."
	@make build-frontend
	@make dev
