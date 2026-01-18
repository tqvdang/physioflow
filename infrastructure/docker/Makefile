# =============================================================================
# EMR Docker Development Environment Makefile
# =============================================================================
# Usage: make <target>
# Run 'make help' to see available targets
# =============================================================================

.PHONY: help up down restart logs logs-follow status ps \
        up-dev down-dev restart-dev \
        reset reset-volumes clean \
        psql redis-cli \
        build pull \
        health check

# Default compose files
COMPOSE_FILE := docker-compose.yml
COMPOSE_DEV_FILE := docker-compose.dev.yml
DOCKER_COMPOSE := docker compose

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(CYAN)EMR Docker Development Environment$(RESET)"
	@echo "$(CYAN)====================================$(RESET)"
	@echo ""
	@echo "$(GREEN)Usage:$(RESET) make $(YELLOW)<target>$(RESET)"
	@echo ""
	@echo "$(GREEN)Core Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Core Service Management
# =============================================================================

up: ## Start all services
	@echo "$(GREEN)Starting EMR services...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)Services started successfully$(RESET)"
	@make status

down: ## Stop all services
	@echo "$(YELLOW)Stopping EMR services...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down
	@echo "$(GREEN)Services stopped$(RESET)"

restart: down up ## Restart all services

# =============================================================================
# Development Mode (with extra tools)
# =============================================================================

up-dev: ## Start all services with development tools (Adminer, MailHog, etc.)
	@echo "$(GREEN)Starting EMR services in development mode...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) up -d
	@echo "$(GREEN)Development services started$(RESET)"
	@make status-dev

down-dev: ## Stop all development services
	@echo "$(YELLOW)Stopping EMR development services...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down
	@echo "$(GREEN)Development services stopped$(RESET)"

restart-dev: down-dev up-dev ## Restart development services

# =============================================================================
# Logs
# =============================================================================

logs: ## View logs for all services
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs

logs-follow: ## Follow logs for all services (live)
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs -f

logs-postgres: ## View PostgreSQL logs
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs postgres

logs-keycloak: ## View Keycloak logs
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs keycloak

logs-redis: ## View Redis logs
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs redis

logs-minio: ## View MinIO logs
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs minio

logs-meilisearch: ## View Meilisearch logs
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs meilisearch

# =============================================================================
# Status
# =============================================================================

status: ## Show status of all services
	@echo ""
	@echo "$(CYAN)Service Status$(RESET)"
	@echo "$(CYAN)==============$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "$(CYAN)Service URLs$(RESET)"
	@echo "$(CYAN)============$(RESET)"
	@echo "  PostgreSQL:   localhost:7012"
	@echo "  Redis:        localhost:7013"
	@echo "  Keycloak:     http://localhost:7014"
	@echo "  MinIO API:    http://localhost:7015"
	@echo "  MinIO Console: http://localhost:7016"
	@echo "  Meilisearch:  http://localhost:7017"
	@echo ""

status-dev: ## Show status of all development services
	@echo ""
	@echo "$(CYAN)Development Service Status$(RESET)"
	@echo "$(CYAN)==========================$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) ps
	@echo ""
	@echo "$(CYAN)Service URLs$(RESET)"
	@echo "$(CYAN)============$(RESET)"
	@echo "  PostgreSQL:      localhost:7012"
	@echo "  Redis:           localhost:7013"
	@echo "  Keycloak:        http://localhost:7014"
	@echo "  MinIO API:       http://localhost:7015"
	@echo "  MinIO Console:   http://localhost:7016"
	@echo "  Meilisearch:     http://localhost:7017"
	@echo ""
	@echo "$(CYAN)Development Tools$(RESET)"
	@echo "$(CYAN)=================$(RESET)"
	@echo "  Adminer:         http://localhost:7018"
	@echo "  MailHog:         http://localhost:7021"
	@echo "  Redis Commander: http://localhost:7019"
	@echo ""

ps: status ## Alias for status

health: ## Check health of all services
	@echo "$(CYAN)Checking service health...$(RESET)"
	@echo ""
	@for service in postgres redis keycloak minio meilisearch; do \
		status=$$(docker inspect --format='{{.State.Health.Status}}' emr-$$service 2>/dev/null || echo "not running"); \
		if [ "$$status" = "healthy" ]; then \
			echo "  $(GREEN)$$service: $$status$(RESET)"; \
		elif [ "$$status" = "starting" ]; then \
			echo "  $(YELLOW)$$service: $$status$(RESET)"; \
		else \
			echo "  $(RED)$$service: $$status$(RESET)"; \
		fi; \
	done
	@echo ""

check: health ## Alias for health

# =============================================================================
# Data Management
# =============================================================================

reset: ## Reset all data (removes volumes)
	@echo "$(RED)WARNING: This will delete all data!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(YELLOW)Stopping services and removing volumes...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down -v
	@echo "$(GREEN)All data has been reset$(RESET)"

reset-volumes: ## Remove all volumes (services must be stopped)
	@echo "$(RED)WARNING: This will delete all data volumes!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker volume rm emr-postgres-data emr-redis-data emr-minio-data emr-meilisearch-data 2>/dev/null || true
	@echo "$(GREEN)Volumes removed$(RESET)"

clean: ## Remove all containers, volumes, and networks
	@echo "$(RED)WARNING: This will delete everything!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down -v --remove-orphans
	docker network rm emr-network 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete$(RESET)"

# =============================================================================
# Database Access
# =============================================================================

psql: ## Connect to PostgreSQL (physioflow database)
	@echo "$(CYAN)Connecting to PostgreSQL...$(RESET)"
	docker exec -it emr-postgres psql -U emr -d physioflow

psql-keycloak: ## Connect to PostgreSQL (keycloak database)
	@echo "$(CYAN)Connecting to Keycloak database...$(RESET)"
	docker exec -it emr-postgres psql -U emr -d keycloak

redis-cli: ## Connect to Redis CLI
	@echo "$(CYAN)Connecting to Redis...$(RESET)"
	docker exec -it emr-redis redis-cli

# =============================================================================
# Image Management
# =============================================================================

pull: ## Pull latest images
	@echo "$(CYAN)Pulling latest images...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) pull
	@echo "$(GREEN)Images updated$(RESET)"

build: ## Build/rebuild services
	@echo "$(CYAN)Building services...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build
	@echo "$(GREEN)Build complete$(RESET)"

# =============================================================================
# Individual Service Management
# =============================================================================

start-%: ## Start a specific service (e.g., make start-postgres)
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d $*

stop-%: ## Stop a specific service (e.g., make stop-postgres)
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) stop $*

restart-%: ## Restart a specific service (e.g., make restart-postgres)
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) restart $*

# =============================================================================
# Utilities
# =============================================================================

env: ## Copy .env.example to .env if it doesn't exist
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env from .env.example$(RESET)"; \
	else \
		echo "$(YELLOW).env already exists$(RESET)"; \
	fi

shell-postgres: ## Open a shell in the PostgreSQL container
	docker exec -it emr-postgres sh

shell-redis: ## Open a shell in the Redis container
	docker exec -it emr-redis sh

shell-keycloak: ## Open a shell in the Keycloak container
	docker exec -it emr-keycloak bash

# =============================================================================
# Quick Start
# =============================================================================

init: env up ## Initialize environment (create .env and start services)
	@echo ""
	@echo "$(GREEN)EMR Development Environment Ready!$(RESET)"
	@echo ""
	@make status
