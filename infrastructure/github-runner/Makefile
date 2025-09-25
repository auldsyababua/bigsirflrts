.PHONY: help build register start stop restart logs clean status shell update-workflows

# Default target
help:
	@echo "GitHub Actions Self-Hosted Runner Management"
	@echo "============================================"
	@echo ""
	@echo "Available commands:"
	@echo "  make register       - Get registration token from GitHub"
	@echo "  make build          - Build the runner Docker image"
	@echo "  make start          - Start the runner container"
	@echo "  make stop           - Stop the runner container"
	@echo "  make restart        - Restart the runner container"
	@echo "  make logs           - Show runner logs (follow mode)"
	@echo "  make status         - Show runner status"
	@echo "  make shell          - Open shell in runner container"
	@echo "  make clean          - Remove runner and clean up"
	@echo "  make update-workflows - Update workflows to use self-hosted runner"
	@echo ""
	@echo "Quick start:"
	@echo "  1. make register    (get GitHub token)"
	@echo "  2. make build       (build Docker image)"
	@echo "  3. make start       (start runner)"

# Check if .env exists
check-env:
	@if [ ! -f .env ]; then \
		echo "Error: .env file not found"; \
		echo "Run 'make register' first or copy .env.example to .env"; \
		exit 1; \
	fi

# Register runner and create .env
register:
	@chmod +x register-runner.sh
	@./register-runner.sh

# Build Docker image with caching
build:
	@echo "Building optimized runner image..."
	@docker-compose build --no-cache

# Start the runner
start: check-env
	@echo "Starting GitHub Actions runner..."
	@docker-compose up -d
	@echo "Runner started! Check logs with: make logs"
	@echo "Runner will appear at: https://github.com/$(shell grep GITHUB_REPOSITORY .env | cut -d'=' -f2)/settings/actions/runners"

# Stop the runner
stop:
	@echo "Stopping GitHub Actions runner..."
	@docker-compose down
	@echo "Runner stopped"

# Restart the runner
restart: stop start

# Show logs
logs:
	@docker-compose logs -f github-runner

# Show last 50 lines of logs
logs-tail:
	@docker-compose logs --tail=50 github-runner

# Check runner status
status:
	@echo "Runner container status:"
	@docker-compose ps
	@echo ""
	@echo "Runner processes:"
	@docker-compose exec github-runner ps aux | grep -E "(Runner|run.sh)" || echo "No runner process found"

# Open shell in container
shell:
	@docker-compose exec github-runner /bin/bash

# Clean up everything
clean:
	@echo "Cleaning up runner..."
	@docker-compose down -v
	@rm -rf work/_work/* work/_temp/* work/_actions/*
	@echo "Cleaned up runner and work directories"

# Update workflow files to support self-hosted runner
update-workflows:
	@echo "Updating workflow files to support self-hosted runner..."
	@echo "Add this to your workflow jobs:"
	@echo ""
	@echo "  runs-on: [self-hosted, local, fast]"
	@echo ""
	@echo "Or use a matrix strategy:"
	@echo ""
	@echo "  strategy:"
	@echo "    matrix:"
	@echo "      runner: [ubuntu-latest, self-hosted]"
	@echo "  runs-on: \$${{ matrix.runner }}"

# Performance test comparison
perf-test: check-env
	@echo "Running performance comparison..."
	@echo "Local runner: $(shell docker-compose exec github-runner date +%s 2>/dev/null || echo 'Not running')"
	@echo "To test performance:"
	@echo "1. Push a commit with [test-local] in the message"
	@echo "2. Compare workflow run times in GitHub Actions tab"

# Install pre-commit hook for faster local testing
install-hooks:
	@echo "Installing pre-push hook for local runner..."
	@cat > ../../.git/hooks/pre-push << 'EOF'
	#!/bin/bash
	# Run tests locally before pushing
	if docker-compose -f infrastructure/github-runner/docker-compose.yml ps | grep -q "Up"; then
	    echo "Local runner detected, running quick tests..."
	    npm run lint
	    npm run format:check
	fi
	EOF
	@chmod +x ../../.git/hooks/pre-push
	@echo "Pre-push hook installed"