# Backup Service Makefile
# Provides convenient commands for development and deployment

.PHONY: help install start dev stop clean docker-build docker-run docker-stop compose-up compose-down logs test setup version-patch version-minor version-major

# Default target
.DEFAULT_GOAL := help

# Variables
VERSION := $(shell cat VERSION 2>/dev/null || echo "1.0.0")
IMAGE_NAME := backup-service
CONTAINER_NAME := backup-service

help: ## Show this help message
	@echo "Backup Service - Available Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "Current version: $(VERSION)"

install: ## Install dependencies
	@echo "Installing dependencies..."
	npm install

start: ## Start the service in production mode
	@echo "Starting backup service in production mode..."
	NODE_ENV=production npm start

dev: ## Start the service in development mode with auto-reload
	@echo "Starting backup service in development mode..."
	npm run dev

stop: ## Stop all running services
	@echo "Stopping all services..."
	-docker stop $(CONTAINER_NAME) 2>/dev/null || true
	-docker rm $(CONTAINER_NAME) 2>/dev/null || true
	-docker-compose down 2>/dev/null || true

clean: stop ## Clean up containers, images, and volumes
	@echo "Cleaning up Docker resources..."
	-docker rmi $(IMAGE_NAME):latest 2>/dev/null || true
	-docker volume prune -f
	@echo "Cleaning up node modules..."
	rm -rf node_modules
	@echo "Cleaning up logs and temp files..."
	rm -rf logs/* temp/*

docker-build: ## Build Docker image
	@echo "Building Docker image $(IMAGE_NAME):$(VERSION)..."
	docker build -t $(IMAGE_NAME):latest -t $(IMAGE_NAME):$(VERSION) .

docker-run: docker-build ## Build and run Docker container
	@echo "Running Docker container..."
	-docker stop $(CONTAINER_NAME) 2>/dev/null || true
	-docker rm $(CONTAINER_NAME) 2>/dev/null || true
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p 3000:3000 \
		-v backup_data:/app/data \
		-v backup_logs:/app/logs \
		-v backup_temp:/app/temp \
		$(IMAGE_NAME):latest
	@echo "Container started. Service available at http://localhost:3000"

docker-stop: ## Stop and remove Docker container
	@echo "Stopping Docker container..."
	-docker stop $(CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME)

compose-up: ## Start services with Docker Compose
	@echo "Starting services with Docker Compose..."
	docker-compose up -d --build
	@echo "Services started. Available at http://localhost:3000"

compose-down: ## Stop Docker Compose services
	@echo "Stopping Docker Compose services..."
	docker-compose down

logs: ## Show application logs
	@if docker ps | grep -q $(CONTAINER_NAME); then \
		echo "Showing Docker container logs..."; \
		docker logs -f $(CONTAINER_NAME); \
	elif [ -f "logs/backup_service.log" ]; then \
		echo "Showing application logs..."; \
		tail -f logs/backup_service.log; \
	else \
		echo "No logs found. Service may not be running."; \
	fi

test: ## Run tests
	@echo "Running tests..."
	npm test

setup: ## Run setup configuration
	@echo "Running setup..."
	npm run setup

version-patch: ## Bump patch version (1.0.0 -> 1.0.1)
	@echo "Bumping patch version..."
	npm version patch --no-git-tag-version
	@node -p "require('./package.json').version" > VERSION
	@echo "Version updated to $(shell cat VERSION)"

version-minor: ## Bump minor version (1.0.0 -> 1.1.0)
	@echo "Bumping minor version..."
	npm version minor --no-git-tag-version
	@node -p "require('./package.json').version" > VERSION
	@echo "Version updated to $(shell cat VERSION)"

version-major: ## Bump major version (1.0.0 -> 2.0.0)
	@echo "Bumping major version..."
	npm version major --no-git-tag-version
	@node -p "require('./package.json').version" > VERSION
	@echo "Version updated to $(shell cat VERSION)"

health: ## Check service health
	@echo "Checking service health..."
	@if curl -f http://localhost:3000/health >/dev/null 2>&1; then \
		echo "✅ Service is healthy"; \
		curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health; \
	else \
		echo "❌ Service is not responding"; \
		exit 1; \
	fi

status: ## Show service status
	@echo "=== Service Status ==="
	@echo "Version: $(VERSION)"
	@echo ""
	@echo "Docker Container:"
	@if docker ps | grep -q $(CONTAINER_NAME); then \
		echo "✅ Running"; \
		docker ps | grep $(CONTAINER_NAME); \
	else \
		echo "❌ Not running"; \
	fi
	@echo ""
	@echo "Docker Compose:"
	@if docker-compose ps | grep -q backup-service; then \
		echo "✅ Running"; \
		docker-compose ps; \
	else \
		echo "❌ Not running"; \
	fi
	@echo ""
	@echo "Local Process:"
	@if pgrep -f "node.*server.js" >/dev/null; then \
		echo "✅ Running"; \
		ps aux | grep "node.*server.js" | grep -v grep; \
	else \
		echo "❌ Not running"; \
	fi

backup-data: ## Backup application data
	@echo "Creating data backup..."
	@mkdir -p backups
	@tar -czf backups/backup-data-$(shell date +%Y%m%d-%H%M%S).tar.gz data/ logs/ .env 2>/dev/null || true
	@echo "Data backup created in backups/ directory"

restore-data: ## Restore application data (specify BACKUP_FILE=filename)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "Please specify BACKUP_FILE=filename"; \
		echo "Available backups:"; \
		ls -la backups/ 2>/dev/null || echo "No backups found"; \
		exit 1; \
	fi
	@echo "Restoring data from $(BACKUP_FILE)..."
	@tar -xzf backups/$(BACKUP_FILE)
	@echo "Data restored successfully"

# Development helpers
dev-reset: clean install ## Reset development environment
	@echo "Resetting development environment..."
	@mkdir -p data logs temp
	@echo "Development environment reset complete"

dev-logs: ## Show development logs with colors
	@if [ -f "logs/backup_service.log" ]; then \
		tail -f logs/backup_service.log | sed 's/\[32m/\x1b[32m/g; s/\[31m/\x1b[31m/g; s/\[33m/\x1b[33m/g; s/\[m/\x1b[0m/g'; \
	else \
		echo "No log file found. Start the service first."; \
	fi
