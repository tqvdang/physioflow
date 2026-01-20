# =============================================================================
# PhysioFlow EMR - Development Makefile
# =============================================================================
# Usage: make <target>
# Run 'make help' to see available targets
# =============================================================================

.PHONY: help dev dev-local up down restart logs status \
        build clean reset \
        api web infra migrate seed \
        psql redis-cli test test-e2e test-e2e-ui test-e2e-headed test-api test-all lint typecheck \
        secrets secrets-local secrets-init secrets-web secrets-push \
        deploy-dev deploy-staging deploy-prod deploy-build \
        homelab-keycloak homelab-secrets homelab-status homelab-setup

# Colors
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# =============================================================================
# Help
# =============================================================================

help: ## Show this help
	@echo ""
	@echo "$(CYAN)PhysioFlow EMR - Development Commands$(RESET)"
	@echo "$(CYAN)======================================$(RESET)"
	@echo ""
	@echo "$(GREEN)Quick Start:$(RESET)"
	@echo "  $(YELLOW)make dev$(RESET)        - Start everything (Docker containers)"
	@echo "  $(YELLOW)make dev-local$(RESET)  - Start infra + run apps locally (for hot reload)"
	@echo ""
	@echo "$(GREEN)All Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Main Development Commands
# =============================================================================

dev: ## Start full stack in Docker (API + Web + Infrastructure)
	@echo "$(GREEN)Starting PhysioFlow EMR...$(RESET)"
	docker compose up -d --build
	@echo ""
	@echo "$(GREEN)PhysioFlow is starting up!$(RESET)"
	@echo ""
	@echo "Services will be available at:"
	@echo "  $(CYAN)Web App:$(RESET)      http://localhost:7010"
	@echo "  $(CYAN)API:$(RESET)          http://localhost:7011"
	@echo "  $(CYAN)Keycloak:$(RESET)     http://localhost:7014 (admin/admin_secret)"
	@echo "  $(CYAN)MinIO:$(RESET)        http://localhost:7016 (minio_admin/minio_secret)"
	@echo "  $(CYAN)PostgreSQL:$(RESET)   localhost:7012 (emr/emr_secret)"
	@echo ""
	@echo "$(YELLOW)Note: Keycloak takes ~60-90 seconds to start$(RESET)"
	@echo "Run 'make logs' to see container logs"
	@echo "Run 'make status' to check service health"

dev-local: infra ## Start infrastructure only (for local app development with hot reload)
	@echo ""
	@echo "$(GREEN)Infrastructure is running!$(RESET)"
	@echo ""
	@echo "Now start the apps locally in separate terminals:"
	@echo "  $(CYAN)Terminal 1 (API):$(RESET)  cd apps/api && go run cmd/api/main.go"
	@echo "  $(CYAN)Terminal 2 (Web):$(RESET)  pnpm dev"
	@echo ""

infra: ## Start only infrastructure services (DB, Redis, Keycloak, etc.)
	@echo "$(GREEN)Starting infrastructure services...$(RESET)"
	docker compose up -d postgres redis keycloak minio meilisearch db-migrate
	@make wait-healthy
	@echo "$(GREEN)Infrastructure ready!$(RESET)"

up: dev ## Alias for 'make dev'

down: ## Stop all services
	@echo "$(YELLOW)Stopping PhysioFlow...$(RESET)"
	docker compose down
	@echo "$(GREEN)All services stopped$(RESET)"

restart: down dev ## Restart all services

# =============================================================================
# Build & Clean
# =============================================================================

build: ## Build all Docker images
	@echo "$(GREEN)Building Docker images...$(RESET)"
	docker compose build

clean: ## Stop and remove all containers, networks
	@echo "$(RED)Cleaning up...$(RESET)"
	docker compose down -v --remove-orphans
	@echo "$(GREEN)Cleanup complete$(RESET)"

reset: ## Full reset - remove all data and rebuild
	@echo "$(RED)WARNING: This will delete all data!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v --remove-orphans
	docker compose up -d --build
	@echo "$(GREEN)Reset complete$(RESET)"

# =============================================================================
# Individual Services
# =============================================================================

api: ## Start only the API service
	docker compose up -d api

web: ## Start only the Web service
	docker compose up -d web

migrate: ## Run database migrations
	@echo "$(GREEN)Running migrations...$(RESET)"
	docker compose up db-migrate
	@echo "$(GREEN)Migrations complete$(RESET)"

seed: ## Seed the database with sample data
	@echo "$(GREEN)Seeding database...$(RESET)"
	docker compose exec postgres psql -U emr -d physioflow -f /seeds/exercises.sql
	docker compose exec postgres psql -U emr -d physioflow -f /seeds/checklists.sql
	@echo "$(GREEN)Seeding complete$(RESET)"

# =============================================================================
# Logs & Status
# =============================================================================

logs: ## View logs for all services
	docker compose logs -f

logs-api: ## View API logs
	docker compose logs -f api

logs-web: ## View Web logs
	docker compose logs -f web

status: ## Show service status
	@echo ""
	@echo "$(CYAN)Service Status:$(RESET)"
	@docker compose ps
	@echo ""

wait-healthy: ## Wait for services to be healthy
	@echo "$(YELLOW)Waiting for services to be healthy...$(RESET)"
	@timeout=120; \
	while [ $$timeout -gt 0 ]; do \
		if docker compose ps | grep -q "unhealthy\|starting"; then \
			sleep 5; \
			timeout=$$((timeout - 5)); \
			echo "Waiting... ($$timeout seconds remaining)"; \
		else \
			echo "$(GREEN)All services healthy!$(RESET)"; \
			break; \
		fi \
	done

# =============================================================================
# Database Tools
# =============================================================================

psql: ## Connect to PostgreSQL
	docker compose exec postgres psql -U emr -d physioflow

redis-cli: ## Connect to Redis
	docker compose exec redis redis-cli

# =============================================================================
# Development Tools
# =============================================================================

test: ## Run all tests (unit + integration)
	@echo "$(GREEN)Running all tests...$(RESET)"
	cd apps/api && go test ./...

test-e2e: ## Run Playwright e2e tests (requires running services)
	@echo "$(GREEN)Running e2e tests...$(RESET)"
	cd apps/web && pnpm test:e2e

test-e2e-ui: ## Run Playwright e2e tests with UI
	@echo "$(GREEN)Running e2e tests with UI...$(RESET)"
	cd apps/web && pnpm test:e2e:ui

test-e2e-headed: ## Run Playwright e2e tests in headed mode
	cd apps/web && pnpm test:e2e:headed

test-api: ## Run Go API integration tests
	@echo "$(GREEN)Running API tests...$(RESET)"
	cd apps/api && go test -v ./tests/integration/...

test-all: test test-e2e ## Run all tests (unit + e2e)
	@echo "$(GREEN)All tests completed$(RESET)"

lint: ## Run linters
	@echo "$(GREEN)Running linters...$(RESET)"
	cd apps/web && pnpm lint

typecheck: ## Run TypeScript type checking
	cd apps/web && pnpm type-check

# =============================================================================
# Secrets Management (Infisical)
# =============================================================================

INFISICAL_URL := https://secrets.trancloud.work

# Project-specific credentials (set these in your shell profile)
# PHYSIOFLOW_INFISICAL_CLIENT_ID
# PHYSIOFLOW_INFISICAL_CLIENT_SECRET

secrets: ## Pull secrets from Infisical and create .env file
	@echo "$(GREEN)Pulling secrets from Infisical...$(RESET)"
	@if [ -z "$$PHYSIOFLOW_INFISICAL_CLIENT_ID" ]; then \
		echo "$(RED)Error: PHYSIOFLOW_INFISICAL_CLIENT_ID not set$(RESET)"; \
		echo "Run: export PHYSIOFLOW_INFISICAL_CLIENT_ID=<your-client-id>"; \
		echo "     export PHYSIOFLOW_INFISICAL_CLIENT_SECRET=<your-client-secret>"; \
		exit 1; \
	fi
	INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=$$PHYSIOFLOW_INFISICAL_CLIENT_ID \
	INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=$$PHYSIOFLOW_INFISICAL_CLIENT_SECRET \
	INFISICAL_API_URL=$(INFISICAL_URL) infisical export --env=dev --format=dotenv | sed "s/'//g" > .env
	@echo "$(GREEN)Created .env file$(RESET)"

secrets-local: ## Pull secrets for local environment
	@echo "$(GREEN)Pulling local secrets from Infisical...$(RESET)"
	INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=$$PHYSIOFLOW_INFISICAL_CLIENT_ID \
	INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=$$PHYSIOFLOW_INFISICAL_CLIENT_SECRET \
	INFISICAL_API_URL=$(INFISICAL_URL) infisical export --env=local --format=dotenv | sed "s/'//g" > .env
	@echo "$(GREEN)Created .env file from local environment$(RESET)"

secrets-init: ## Initialize Infisical for this project (first time setup)
	@echo "$(CYAN)Infisical Setup for PhysioFlow$(RESET)"
	@echo ""
	@echo "1. Get Machine Identity credentials from: $(INFISICAL_URL)"
	@echo "   Project: physioflow | Identity: physioflow-dev"
	@echo ""
	@echo "2. Add to your shell profile (~/.bashrc or ~/.zshrc):"
	@echo "   export PHYSIOFLOW_INFISICAL_CLIENT_ID=<client-id>"
	@echo "   export PHYSIOFLOW_INFISICAL_CLIENT_SECRET=<client-secret>"
	@echo ""
	@echo "3. Reload shell and run: make secrets"
	@echo ""
	@if [ ! -f .infisical.json ]; then \
		echo '{"workspaceId": "27ea4da3-9a1e-4e84-aa71-31e9f9dce74c", "defaultEnvironment": "dev"}' > .infisical.json; \
		echo "$(GREEN)Created .infisical.json$(RESET)"; \
	fi

secrets-web: ## Export secrets for web app (.env.local)
	@echo "$(GREEN)Creating apps/web/.env.local...$(RESET)"
	INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=$$PHYSIOFLOW_INFISICAL_CLIENT_ID \
	INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=$$PHYSIOFLOW_INFISICAL_CLIENT_SECRET \
	INFISICAL_API_URL=$(INFISICAL_URL) infisical export --env=dev --format=dotenv | sed "s/'//g" | grep "^NEXT_PUBLIC" > apps/web/.env.local
	@echo "$(GREEN)Created apps/web/.env.local$(RESET)"

secrets-push: ## Push local .env to Infisical (dev environment)
	@echo "$(GREEN)Pushing .env to Infisical...$(RESET)"
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found$(RESET)"; \
		exit 1; \
	fi
	@INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=$$PHYSIOFLOW_INFISICAL_CLIENT_ID \
	INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=$$PHYSIOFLOW_INFISICAL_CLIENT_SECRET \
	INFISICAL_API_URL=$(INFISICAL_URL) infisical secrets set $$(cat .env | grep -v '^#' | grep -v '^$$' | sed "s/'//g" | tr '\n' ' ') --env=dev
	@echo "$(GREEN)Secrets pushed to Infisical (dev)$(RESET)"

# =============================================================================
# Homelab Deployment
# =============================================================================

HOMELAB_DIR := infrastructure/homelab

deploy-dev: ## Deploy to homelab dev environment
	@echo "$(GREEN)Deploying to dev environment...$(RESET)"
	$(HOMELAB_DIR)/scripts/deploy.sh dev --all

deploy-staging: ## Deploy to homelab staging environment
	@echo "$(GREEN)Deploying to staging environment...$(RESET)"
	$(HOMELAB_DIR)/scripts/deploy.sh staging --all

deploy-prod: ## Deploy to homelab production environment
	@echo "$(YELLOW)Deploying to PRODUCTION environment...$(RESET)"
	@read -p "Are you sure you want to deploy to production? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(HOMELAB_DIR)/scripts/deploy.sh prod --all

deploy-build: ## Build images for all environments
	@echo "$(GREEN)Building images...$(RESET)"
	$(HOMELAB_DIR)/scripts/deploy.sh dev --build
	$(HOMELAB_DIR)/scripts/deploy.sh staging --build
	$(HOMELAB_DIR)/scripts/deploy.sh prod --build

homelab-keycloak: ## Import Keycloak realms to homelab
	@echo "$(GREEN)Importing Keycloak realms...$(RESET)"
	$(HOMELAB_DIR)/scripts/import-keycloak-realms.sh

homelab-secrets: ## Sync secrets from Infisical (usage: make homelab-secrets ENV=dev)
	@echo "$(GREEN)Syncing secrets for $(ENV) environment...$(RESET)"
	$(HOMELAB_DIR)/scripts/sync-secrets.sh $(ENV)

homelab-status: ## Check homelab deployment status
	@echo "$(CYAN)PhysioFlow Homelab Status$(RESET)"
	@echo ""
	@echo "$(GREEN)Dev Environment:$(RESET)"
	@kubectl get pods -n physioflow-dev 2>/dev/null || echo "  Not deployed"
	@echo ""
	@echo "$(GREEN)Staging Environment:$(RESET)"
	@kubectl get pods -n physioflow-staging 2>/dev/null || echo "  Not deployed"
	@echo ""
	@echo "$(GREEN)Production Environment:$(RESET)"
	@kubectl get pods -n physioflow-prod 2>/dev/null || echo "  Not deployed"

homelab-setup: ## Show homelab setup instructions
	@$(HOMELAB_DIR)/scripts/setup-infisical-project.sh

# =============================================================================
# Quick Reference
# =============================================================================

urls: ## Show all service URLs
	@echo ""
	@echo "$(CYAN)PhysioFlow Service URLs$(RESET)"
	@echo "$(CYAN)========================$(RESET)"
	@echo ""
	@echo "$(GREEN)Applications:$(RESET)"
	@echo "  Web App:        http://localhost:7010"
	@echo "  API:            http://localhost:7011"
	@echo ""
	@echo "$(GREEN)Infrastructure:$(RESET)"
	@echo "  PostgreSQL:     localhost:7012 (emr/emr_secret)"
	@echo "  Redis:          localhost:7013"
	@echo "  Keycloak:       http://localhost:7014 (admin/admin_secret)"
	@echo "  MinIO API:      http://localhost:7015"
	@echo "  MinIO Console:  http://localhost:7016 (minio_admin/minio_secret)"
	@echo "  Meilisearch:    http://localhost:7017"
	@echo ""
	@echo "$(GREEN)Test Users (password: 'password'):$(RESET)"
	@echo "  admin, therapist1, assistant1, frontdesk1"
	@echo ""
