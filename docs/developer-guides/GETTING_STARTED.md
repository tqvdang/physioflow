# Developer Guide: Getting Started

Welcome to PhysioFlow development! This guide will help you set up your development environment and start contributing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Running Tests](#running-tests)
- [Code Structure](#code-structure)
- [Development Workflow](#development-workflow)
- [Git Conventions](#git-conventions)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js** 20.0.0 or higher
  - Download: https://nodejs.org/
  - Verify: `node --version`

- **Go** 1.22 or higher
  - Download: https://go.dev/dl/
  - Verify: `go version`

- **pnpm** 9.15.0 or higher
  - Install: `npm install -g pnpm`
  - Verify: `pnpm --version`

- **Docker Desktop**
  - Download: https://www.docker.com/products/docker-desktop/
  - Verify: `docker --version` and `docker compose version`

- **Git**
  - Download: https://git-scm.com/downloads
  - Verify: `git --version`

### Optional (but recommended)

- **Make** (for using Makefile commands)
  - macOS: Already installed
  - Linux: `sudo apt-get install build-essential`
  - Windows: Install via WSL or use Git Bash

- **PostgreSQL client** (for database CLI access)
  - macOS: `brew install postgresql`
  - Linux: `sudo apt-get install postgresql-client`

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tqvdang/physioflow.git
cd physioflow
```

### 2. Install Dependencies

Install all monorepo dependencies using pnpm workspaces:

```bash
pnpm install
```

This installs dependencies for:
- `apps/web` (Next.js frontend)
- `apps/mobile` (React Native mobile app)
- `packages/shared-types` (TypeScript types)
- `packages/shared-utils` (Utilities)

For the Go API, dependencies are managed by Go modules:

```bash
cd apps/api
go mod download
cd ../..
```

### 3. Start Infrastructure Services

The development environment requires PostgreSQL, Redis, Keycloak, MinIO, and Meilisearch.

**Using Makefile (recommended)**:

```bash
make dev
```

This starts all infrastructure services and applications in Docker.

**Manual setup**:

```bash
cd infrastructure/docker
cp .env.example .env
make init
make status  # Verify all services are running
```

Services will be available at:
- PostgreSQL: `localhost:7012`
- Redis: `localhost:7013`
- Keycloak: `http://localhost:7014`
- MinIO: `http://localhost:7015` (console: `http://localhost:7016`)
- Meilisearch: `http://localhost:7017`

## Environment Variables

### Infisical Integration

PhysioFlow uses Infisical for secrets management. To pull secrets:

**Step 1: Get Infisical credentials**

1. Log in to Infisical: https://secrets.trancloud.work
2. Navigate to **Organization Settings** → **Machine Identities** → `physioflow-dev`
3. Copy the Client ID and Client Secret

**Step 2: Set environment variables**

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
export PHYSIOFLOW_INFISICAL_CLIENT_ID="<client-id>"
export PHYSIOFLOW_INFISICAL_CLIENT_SECRET="<client-secret>"
```

Reload your shell:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

**Step 3: Pull secrets**

```bash
make secrets        # Pull dev secrets to infrastructure/docker/.env
make secrets-web    # Export NEXT_PUBLIC_* to apps/web/.env.local
```

### Manual Environment Setup (Alternative)

If you don't have Infisical access, copy the example files:

**Web app** (`apps/web/.env.local`):

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:7011/api
NEXT_PUBLIC_APP_URL=http://localhost:7010
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:7014
NEXT_PUBLIC_KEYCLOAK_REALM=physioflow
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=physioflow-web
```

**Mobile app** (`apps/mobile/.env`):

```bash
cd apps/mobile
cp .env.example .env
```

Edit `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:7011/api/v1
```

**Infrastructure** (`infrastructure/docker/.env`):

```bash
cd infrastructure/docker
cp .env.example .env
```

The defaults in `.env.example` work for local development.

## Running Locally

### Full Stack (Recommended for Hot Reload)

Start infrastructure only, run apps locally for hot reload:

```bash
make dev-local
```

This starts:
- PostgreSQL, Redis, Keycloak, MinIO, Meilisearch in Docker
- Web app at `http://localhost:7010` (local pnpm process)
- API at `http://localhost:7011` (local Go process)

### Full Stack in Docker

Start everything in Docker (infrastructure + apps):

```bash
make dev
```

This is slower for development due to no hot reload, but useful for testing production-like deployments.

### Run Individual Apps

**Web app only**:

```bash
pnpm --filter @physioflow/web dev
```

**API only**:

```bash
cd apps/api
go run cmd/api/main.go
```

**Mobile app**:

```bash
pnpm --filter @physioflow/mobile dev
```

This starts Expo, follow terminal instructions to open in:
- iOS Simulator (macOS only)
- Android Emulator
- Expo Go app on physical device

## Running Tests

### All Tests

Run the full test suite (unit + integration + e2e):

```bash
make test-all
```

### Backend Tests

**Go unit tests**:

```bash
make test
# Or manually:
cd apps/api
go test ./...
```

**Go integration tests** (requires running PostgreSQL):

```bash
make test-api
# Or manually:
cd apps/api
go test -tags=integration ./tests/integration/...
```

### Frontend Tests

**Web app unit tests** (Vitest):

```bash
pnpm --filter @physioflow/web test
```

**E2E tests** (Playwright):

```bash
make test-e2e           # Headless mode
make test-e2e-ui        # With Playwright UI
make test-e2e-headed    # In headed browser
```

**Specific E2E test**:

```bash
cd apps/web
pnpm test:e2e tests/e2e/outcome-measures-crud.spec.ts
```

### Test Coverage

**Backend coverage**:

```bash
cd apps/api
go test -cover ./...
```

**Frontend coverage**:

```bash
pnpm --filter @physioflow/web test:coverage
```

## Code Structure

PhysioFlow uses a monorepo structure with pnpm workspaces and Turborepo.

### High-Level Layout

```
physioflow/
├── apps/
│   ├── web/           Next.js frontend
│   ├── mobile/        React Native (Expo) mobile app
│   └── api/           Go backend
├── packages/
│   ├── shared-types/  Shared TypeScript types
│   └── shared-utils/  Shared utilities
├── infrastructure/
│   ├── docker/        Docker Compose dev environment
│   ├── db/            Database migrations & seeds
│   └── homelab/       K8s manifests for homelab deployment
└── docs/              Documentation
```

### Web App Structure (`apps/web/src/`)

```
src/
├── app/
│   └── [locale]/      Internationalized routes (vi, en)
│       ├── auth/      Authentication pages
│       ├── patients/  Patient management
│       └── ...
├── components/
│   ├── ui/            shadcn/ui base components
│   ├── outcome-measures/
│   ├── anatomy/
│   └── ...
├── hooks/             Custom React hooks
├── lib/               Utilities (cn(), API client, etc.)
└── types/             TypeScript types
```

**Import aliases** (configured in `tsconfig.json`):
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`

### API Structure (`apps/api/`)

```
apps/api/
├── cmd/api/           Application entry point (main.go)
├── internal/
│   ├── config/        Configuration management
│   ├── handler/       HTTP handlers
│   ├── middleware/    HTTP middleware
│   ├── model/         Domain models
│   ├── repository/    Data access layer
│   ├── service/       Business logic
│   ├── circuitbreaker/ Circuit breaker pattern
│   ├── retry/         Retry logic with backoff
│   └── cache/         Redis caching
├── pkg/               Reusable packages
└── tests/
    ├── integration/   Integration tests
    └── performance/   Performance benchmarks
```

**Layer Architecture**:
```
Handler → Service → Repository → Database
        ↓         ↓
   Middleware   Cache
```

## Development Workflow

### Feature Development

**Step 1: Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

**Step 2: Make changes**

Follow existing patterns:
- Frontend: Use shadcn/ui components, React Query for data fetching
- Backend: Follow clean architecture (handler → service → repository)
- Tests: Write tests for new features

**Step 3: Run tests and linters**

```bash
pnpm lint          # Lint all packages
pnpm typecheck     # TypeScript type checking
pnpm format        # Format code with Prettier
make test-all      # Run all tests
```

**Step 4: Commit changes**

Use conventional commits:

```bash
git commit -m "feat(web): add outcome measure trending chart"
git commit -m "fix(api): resolve race condition in sync queue"
git commit -m "test: add integration tests for anatomy regions"
```

**Step 5: Push and create PR**

```bash
git push origin feature/your-feature-name
```

Create a pull request on GitHub.

## Git Conventions

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no functionality change)
- `test`: Adding or updating tests
- `chore`: Build process, tooling changes
- `perf`: Performance improvements

**Scopes**:
- `web`: Web frontend
- `mobile`: Mobile app
- `api`: Backend API
- `db`: Database changes
- `infra`: Infrastructure

**Examples**:

```bash
feat(api): add anatomy regions endpoint with 58 regions
fix(web): resolve version conflict error in outcome measures
docs(user-guides): add MCID explanation for outcome measures
test(api): add integration tests for optimistic locking
chore(docker): update PostgreSQL to version 16.2
```

### Branch Naming

```
feature/description   # New features
fix/description       # Bug fixes
docs/description      # Documentation
refactor/description  # Code refactoring
test/description      # Test additions
```

**Examples**:
- `feature/outcome-measures-trending`
- `fix/anatomy-regions-loading`
- `docs/developer-getting-started`

### Pull Request Process

1. Ensure all tests pass locally
2. Update documentation if needed
3. Add changelog entry for user-facing changes
4. Request review from at least one maintainer
5. Address review comments
6. Squash commits before merging (if multiple commits)

### No AI Attribution

Do NOT include AI attribution in commit messages, PR descriptions, or code comments. No "Co-Authored-By: Claude" or similar credits.

## Troubleshooting

### Docker services won't start

**Issue**: Port already in use (e.g., PostgreSQL on 7012).

**Solution**:

```bash
# Check what's using the port
lsof -i :7012

# Stop conflicting services or change ports in infrastructure/docker/.env
```

### pnpm install fails

**Issue**: Node version mismatch.

**Solution**:

```bash
# Check Node version
node --version

# Should be >= 20.0.0
# If not, install correct version (use nvm):
nvm install 20
nvm use 20
```

### Keycloak returns 401 Unauthorized

**Issue**: Token expired or invalid realm.

**Solution**:

1. Check `NEXT_PUBLIC_KEYCLOAK_REALM` matches `physioflow` (local) or `physioflow-dev` (homelab)
2. Log out and log back in to get a fresh token
3. Clear browser cookies for `localhost:7010`

### API returns 500 on database queries

**Issue**: Database not initialized or migrations not run.

**Solution**:

```bash
# Check PostgreSQL is running
make status

# Connect to database
make psql

# Check tables exist
\dt

# If empty, run migrations
cd infrastructure/db
psql -U emr -h localhost -p 7012 -d physioflow -f migrations/001_initial_schema.sql
# ... run remaining migrations in order
```

### Hot reload not working in web app

**Issue**: Next.js watch mode broken.

**Solution**:

```bash
# Clear Next.js cache
cd apps/web
rm -rf .next

# Restart dev server
pnpm dev
```

### Mobile app can't connect to API

**Issue**: Expo can't reach `localhost:7011` from device/simulator.

**Solution**:

For physical device, use your computer's local IP:

```bash
# Find your IP
ifconfig | grep "inet "  # macOS/Linux
ipconfig                  # Windows

# Update apps/mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:7011/api/v1
```

For Android Emulator, use `10.0.2.2` instead of `localhost`:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:7011/api/v1
```

### Tests fail with "hasPointerCapture is not a function"

**Issue**: Radix UI components not fully supported in JSDOM (Vitest).

**Solution**:

Add polyfill to test setup (`apps/web/src/__tests__/setup.ts`):

```typescript
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
```

Or use Playwright for component testing instead of Vitest.

### Go tests fail with "connection refused"

**Issue**: PostgreSQL not running or wrong port.

**Solution**:

Integration tests require PostgreSQL. Start infrastructure:

```bash
make dev-local
```

Check test database connection in `apps/api/tests/integration/setup_test.go`:

```go
dsn := "postgres://emr:emr_password@localhost:7012/physioflow?sslmode=disable"
```

## Next Steps

- Read [Architecture Guide](./ARCHITECTURE.md) for system design overview
- Review [Production Hardening](./PRODUCTION_HARDENING.md) for resilience patterns
- Check [CLAUDE.md](../../CLAUDE.md) for project-specific conventions
- Explore existing code in `apps/web/src/components` for frontend patterns
- Study `apps/api/internal/handler` for backend patterns

## Getting Help

- **Documentation**: Check `docs/` directory
- **Code examples**: Look at existing components and tests
- **Issues**: Open a GitHub issue for bugs or questions
- **Email**: tqvdang@msn.com

Welcome to PhysioFlow development!
