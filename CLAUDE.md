# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note:** This file is globally ignored by git. Do not attempt to commit it.

## Project Overview

PhysioFlow is a Physical Therapy EHR system for Vietnamese healthcare settings. It uses a monorepo structure with pnpm workspaces and Turborepo.

**Tech Stack:**
- Frontend: Next.js 14, TypeScript, shadcn/ui (Radix UI + Tailwind)
- Mobile: React Native with Expo 50, WatermelonDB for offline storage
- Backend: Go 1.22 with Echo v4
- Infrastructure: PostgreSQL 16, Redis 7, Keycloak (auth), MinIO (storage), Meilisearch

## Commands

### Root Makefile (preferred)
```bash
make help          # Show all available commands
make dev           # Start full stack in Docker (API + Web + Infra)
make dev-local     # Start infra only, run apps locally (for hot reload)
make down          # Stop all services
make status        # Show service status
make logs          # View all logs
make psql          # Connect to PostgreSQL
make redis-cli     # Connect to Redis
make migrate       # Run database migrations
make seed          # Seed database with sample data
make reset         # WARNING: Delete all data and rebuild
```

### pnpm (Turborepo)
```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all apps in dev mode
pnpm build                # Build all packages/apps
pnpm lint                 # Lint all packages/apps
pnpm test                 # Run tests across all packages
pnpm typecheck            # Type check all packages
pnpm format               # Format code with Prettier
pnpm format:check         # Check formatting (CI)
```

### Run specific app
```bash
pnpm --filter @physioflow/web dev     # Web only
pnpm --filter @physioflow/mobile dev  # Mobile only
```

### Go API (from apps/api/)
```bash
go run cmd/api/main.go    # Start API server
go test ./...             # Run all tests
go build ./cmd/api        # Build binary
go mod tidy               # Clean dependencies
```

### Testing (from root)
```bash
make test              # Run Go API unit tests
make test-api          # Run Go API integration tests
make test-e2e          # Run Playwright e2e tests
make test-e2e-ui       # Run Playwright with UI
make test-e2e-headed   # Run Playwright in headed browser
make test-all          # Run all tests (unit + e2e)
```

### Docker Infrastructure (from infrastructure/docker/)
```bash
make init      # First-time setup: create .env and start services
make up        # Start services (PostgreSQL, Redis, Keycloak, MinIO, Meilisearch)
make up-dev    # Start with dev tools (Adminer, MailHog, Redis Commander)
make down      # Stop services
make status    # Show service URLs and status
make health    # Check service health
make psql      # PostgreSQL CLI for physioflow database
make redis-cli # Redis CLI
make logs-follow  # Tail all service logs
make reset     # WARNING: Delete all data and restart
```

### Database (from infrastructure/db/)
```bash
# Run migrations
psql -U emr -d physioflow -f migrations/001_initial_schema.sql

# Seed development data
psql -U emr -d physioflow -f seeds/development_data.sql
```

### Secrets Management (Infisical)
Secrets are stored in Infisical at `https://secrets.trancloud.work` (project: `physioflow`).

```bash
# First-time setup
make secrets-init           # Show setup instructions

# Pull/push secrets
make secrets                # Pull dev secrets → .env
make secrets-local          # Pull local secrets → .env
make secrets-push           # Push .env → Infisical (dev)
make secrets-web            # Export NEXT_PUBLIC_* → apps/web/.env.local
```

**Environment variables required** (add to `~/.bashrc` or `~/.zshrc`):
```bash
export PHYSIOFLOW_INFISICAL_CLIENT_ID="<client-id>"
export PHYSIOFLOW_INFISICAL_CLIENT_SECRET="<client-secret>"
```

Get credentials from Infisical → Organization Settings → Machine Identities → `physioflow-dev`.

## Architecture

### Monorepo Structure
```
apps/
  web/       @physioflow/web      Next.js frontend
  mobile/    @physioflow/mobile   React Native (Expo) app
  api/       Go backend (not a pnpm package)

packages/
  shared-types/   @physioflow/shared-types   TypeScript type definitions
  shared-utils/   @physioflow/shared-utils   Date formatting, validators
  ui/             Shared UI components (planned)

infrastructure/
  docker/    Docker Compose setup with Makefile
  db/        SQL migrations and seeds
  homelab/   Homelab K8s manifests and scripts
    k8s/
      base/       Base Kustomize manifests
      overlays/   Environment-specific (dev, staging, prod)
```

### Go API Layer Architecture (apps/api/)
```
cmd/api/         Application entry point (main.go)
internal/
  config/        Configuration management
  handler/       HTTP request handlers
  middleware/    HTTP middleware (auth, logging, etc.)
  model/         Domain models
  repository/    Data access layer
  service/       Business logic
pkg/             Reusable packages
```

### Web App Structure (apps/web/src/)
```
app/
  [locale]/      Internationalized routes (Vietnamese/English via next-intl)
  auth/          Authentication pages
components/
  ui/            shadcn/ui base components
  checklist/     Checklist-driven visit feature components
  patient/       Patient management components
  schedule/      Scheduling components
  dashboard/     Dashboard components
  layout/        Layout components
  common/        Shared components
contexts/        React contexts
hooks/           Custom hooks
lib/             Utilities (utils.ts for cn() helper)
types/           TypeScript types
```

### Key Import Aliases (web app)
Configured in `components.json` and `tsconfig.json`:
- `@/components` - React components
- `@/components/ui` - shadcn/ui components
- `@/lib` - Utilities
- `@/hooks` - Custom hooks

## Key Concepts

### Checklist-Driven Visits
The core innovation: visits are checklists, not forms. Therapists complete smart checklist items, and SOAP notes auto-generate. Quick actions like "+3 days" scheduling are one-tap.

### Bilingual Support
Uses next-intl with messages in `apps/web/messages/`. Routes are prefixed with locale: `/vi/`, `/en/`.

### Offline-First Mobile
WatermelonDB handles offline storage with queue-based sync to the API when online.

## Service Ports (Development)
All ports use 7010-7021 range to avoid conflicts with other projects.

| Service | Port | URL/Notes |
|---------|------|-----------|
| Web | 7010 | http://localhost:7010 |
| API | 7011 | http://localhost:7011 |
| PostgreSQL | 7012 | localhost:7012 (user: emr, db: physioflow) |
| Redis | 7013 | localhost:7013 |
| Keycloak | 7014 | http://localhost:7014 (admin/admin_secret_dev_only) |
| MinIO API | 7015 | http://localhost:7015 |
| MinIO Console | 7016 | http://localhost:7016 |
| Meilisearch | 7017 | http://localhost:7017 |
| Adminer | 7018 | http://localhost:7018 |
| Redis Commander | 7019 | http://localhost:7019 |
| Mailhog SMTP | 7020 | localhost:7020 |
| Mailhog UI | 7021 | http://localhost:7021 |

## Test Users (Local Keycloak)
- `admin` / `Admin@123` (super_admin)
- `clinic_admin` / `ClinicAdmin@123` (clinic_admin)
- `therapist1` / `Therapist@123` (therapist)
- `assistant1` / `Assistant@123` (assistant)
- `frontdesk1` / `FrontDesk@123` (front_desk)
- `patient1` / `Patient@123` (patient)

## Homelab Deployment

### URLs
| Environment | Web | API |
|-------------|-----|-----|
| Dev | https://physioflow-dev.trancloud.work | https://physioflow-dev.trancloud.work/api |
| Staging | https://physioflow-staging.trancloud.work | https://physioflow-staging.trancloud.work/api |
| Prod | https://physioflow.trancloud.work | https://physioflow.trancloud.work/api |

### Test Users (Homelab Keycloak)
- `therapist@physioflow.local` / `Therapist@123` (therapist)

### Infrastructure
- **K3s Cluster**: 192.168.10.60-62 (master + 2 workers)
- **PostgreSQL**: 192.168.10.24 (LXC 101 on pve2)
- **Keycloak**: https://keycloak.trancloud.work (LXC 104 on pve1, 192.168.10.27)
- **Registry**: registry.trancloud.work (LXC 101 on pve1, 192.168.10.25)

### NodePorts
| Environment | Web | API |
|-------------|-----|-----|
| Dev | 30200 | 30201 |
| Staging | 30210 | 30211 |
| Prod | 30220 | 30221 |

### Makefile Commands
```bash
make deploy-dev        # Deploy to homelab dev environment
make deploy-staging    # Deploy to homelab staging
make deploy-prod       # Deploy to homelab production (requires confirmation)
make homelab-status    # Check deployment status across environments
make homelab-keycloak  # Import Keycloak realms
make homelab-secrets ENV=dev  # Sync secrets from Infisical
```

### Manual Docker Build & Deploy
```bash
# Build web image with homelab environment variables (from repo root)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://physioflow-dev.trancloud.work/api \
  --build-arg NEXT_PUBLIC_APP_URL=https://physioflow-dev.trancloud.work \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.trancloud.work \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=physioflow-dev \
  --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=physioflow-web \
  -t registry.trancloud.work/physioflow-web:dev \
  -f apps/web/Dockerfile .

# Push to registry
docker push registry.trancloud.work/physioflow-web:dev

# Deploy to k3s (from k3s-master)
kubectl apply -k infrastructure/homelab/k8s/overlays/dev
kubectl rollout restart deployment/physioflow-web -n physioflow-dev
```

**Important**: Next.js `NEXT_PUBLIC_*` variables are baked at build time, not runtime. Always rebuild the Docker image when changing these values.

### Infrastructure Reference
Full infrastructure details (IPs, credentials, HAProxy config) are in `/home/dang/dev/infrastructure.yaml`

## Git Conventions

- **No AI attribution**: Do not include AI credits, co-author tags, or any AI-related attribution in commit messages, PR descriptions, or code comments
