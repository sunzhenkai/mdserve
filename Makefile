.PHONY: all build build-frontend build-backend clean install run test

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
	go build -o bin/mdserve ./cmd/mdserve
	@echo "Backend built successfully!"

# Install frontend dependencies
install-frontend:
	cd web && npm install

# Install all dependencies
install: install-frontend
	go mod download

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
	GOOS=linux GOARCH=amd64 go build -o bin/mdserve-linux-amd64 ./cmd/mdserve
	GOOS=darwin GOARCH=amd64 go build -o bin/mdserve-darwin-amd64 ./cmd/mdserve
	GOOS=darwin GOARCH=arm64 go build -o bin/mdserve-darwin-arm64 ./cmd/mdserve
	GOOS=windows GOARCH=amd64 go build -o bin/mdserve-windows-amd64.exe ./cmd/mdserve
	@echo "Multi-platform build complete!"

# Development with frontend watch
dev-full:
	@echo "Starting development environment..."
	@make build-frontend
	@make dev
