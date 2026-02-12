# Developer Guide: Architecture

This document provides a comprehensive overview of PhysioFlow's architecture, technology stack, and design patterns.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [Monorepo Structure](#monorepo-structure)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Mobile Architecture](#mobile-architecture)
- [Database Design](#database-design)
- [Authentication Flow](#authentication-flow)
- [Offline Sync Strategy](#offline-sync-strategy)
- [Deployment Architecture](#deployment-architecture)

## High-Level Architecture

PhysioFlow follows a modern three-tier architecture with offline-first capabilities:

```
┌─────────────────────────────────────────────────┐
│              Client Layer                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┐ │
│  │  Web App    │  │  Mobile App  │  │  PWA   │ │
│  │  (Next.js)  │  │  (Expo RN)   │  │ Offline│ │
│  └─────────────┘  └──────────────┘  └────────┘ │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              API Layer                          │
│  ┌─────────────────────────────────────────┐   │
│  │  Go API Server (Echo v4)                │   │
│  │  - Circuit Breaker                      │   │
│  │  - Retry with Backoff                   │   │
│  │  - Rate Limiting                        │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Data Layer                         │
│  ┌──────────┐  ┌───────┐  ┌──────────────┐     │
│  │PostgreSQL│  │ Redis │  │ Meilisearch  │     │
│  │  (main)  │  │(cache)│  │   (search)   │     │
│  └──────────┘  └───────┘  └──────────────┘     │
│                                                 │
│  ┌──────────┐  ┌──────────────────────────┐    │
│  │  MinIO   │  │  WatermelonDB (mobile)   │    │
│  │ (storage)│  │  (offline storage)       │    │
│  └──────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│           Authentication Layer                  │
│  ┌─────────────────────────────────────────┐   │
│  │  Keycloak (OAuth2/OIDC)                 │   │
│  │  - Role-based access control            │   │
│  │  - SSO support                          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Offline-First**: All client apps work without internet connection
2. **API-Driven**: Thin clients, rich API with business logic
3. **Eventual Consistency**: Sync queues handle delayed updates
4. **Fault Tolerance**: Circuit breakers, retries, graceful degradation
5. **Scalability**: Horizontal scaling, connection pooling, caching
6. **Security**: OAuth2/OIDC, role-based access, encrypted connections

## Technology Stack

### Frontend (Web)

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React framework with App Router | 14 |
| **TypeScript** | Type-safe development | 5.x |
| **shadcn/ui** | Accessible component library | Latest |
| **Radix UI** | Unstyled accessible primitives | Latest |
| **Tailwind CSS** | Utility-first CSS framework | 3.x |
| **React Query** | Server state management | 5.x |
| **Zustand** | Client state management | 4.x |
| **next-intl** | Internationalization (i18n) | 3.x |
| **Zod** | Runtime validation | 3.x |
| **Recharts** | Charts for outcome trending | 2.x |

**Build Tools**:
- Turborepo (monorepo build orchestration)
- pnpm (package manager with workspaces)
- ESLint + Prettier (linting & formatting)
- Vitest (unit testing)
- Playwright (E2E testing)

### Mobile

| Technology | Purpose | Version |
|------------|---------|---------|
| **React Native** | Cross-platform mobile framework | 0.73 |
| **Expo** | Development platform | SDK 50 |
| **WatermelonDB** | Offline-first reactive database | Latest |
| **Expo Router** | File-based navigation | Latest |
| **React Query** | Server state (when online) | 5.x |
| **Zustand** | Client state | 4.x |

### Backend (API)

| Technology | Purpose | Version |
|------------|---------|---------|
| **Go** | Programming language | 1.22 |
| **Echo** | Web framework | v4 |
| **pgx** | PostgreSQL driver | v5 |
| **go-redis** | Redis client | v9 |
| **golang-jwt** | JWT handling | v5 |

**Libraries**:
- `circuitbreaker` (custom): Circuit breaker pattern
- `retry` (custom): Retry with exponential backoff
- `validator/v10`: Request validation
- `testify`: Testing assertions

### Infrastructure

| Service | Purpose | Version |
|---------|---------|---------|
| **PostgreSQL** | Primary database | 16 |
| **Redis** | Cache and job queues | 7 |
| **Keycloak** | OAuth2/OIDC authentication | 23 |
| **MinIO** | S3-compatible object storage | Latest |
| **Meilisearch** | Fast full-text search | 1.5 |

**Deployment**:
- Docker Compose (local development)
- Kubernetes (K3s for homelab production)
- HAProxy (reverse proxy and load balancer)

## Monorepo Structure

PhysioFlow uses pnpm workspaces with Turborepo for efficient monorepo management.

```
physioflow/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   └── lib/           # Utilities
│   │   ├── tests/e2e/         # Playwright tests
│   │   └── package.json
│   │
│   ├── mobile/                 # React Native mobile
│   │   ├── app/               # Expo Router screens
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── database/      # WatermelonDB models
│   │   └── package.json
│   │
│   └── api/                    # Go backend (not a pnpm package)
│       ├── cmd/api/           # Entry point
│       ├── internal/          # Private packages
│       └── tests/             # Go tests
│
├── packages/
│   ├── shared-types/          # TypeScript types shared across apps
│   │   └── src/
│   │       ├── anatomy.ts
│   │       ├── outcome-measures.ts
│   │       └── index.ts
│   │
│   └── shared-utils/          # Utilities shared across apps
│       └── src/
│           ├── date.ts
│           ├── validators.ts
│           └── index.ts
│
├── infrastructure/
│   ├── docker/                # Docker Compose dev environment
│   ├── db/                    # SQL migrations & seeds
│   └── homelab/               # K8s manifests
│
├── docs/                      # Documentation
│   ├── user-guides/
│   ├── developer-guides/
│   └── api/
│
├── pnpm-workspace.yaml        # Workspace configuration
├── turbo.json                 # Turborepo pipeline config
└── package.json               # Root package
```

### Workspace Dependencies

**Web app** depends on:
- `@physioflow/shared-types` (types)
- `@physioflow/shared-utils` (utilities)

**Mobile app** depends on:
- `@physioflow/shared-types` (types)
- `@physioflow/shared-utils` (utilities)

**API** does NOT depend on JS packages (Go is standalone).

### Build Pipeline (Turborepo)

Defined in `turbo.json`:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Commands**:
```bash
pnpm build      # Build all packages in dependency order
pnpm dev        # Start all apps in dev mode
pnpm test       # Run all tests
pnpm lint       # Lint all packages
```

## Backend Architecture

The Go API follows **Clean Architecture** principles with clear layer separation.

### Layer Diagram

```
┌──────────────────────────────────────────────────┐
│                 Handler Layer                    │
│  - HTTP request/response handling                │
│  - Request validation                            │
│  - Error formatting                              │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│                Middleware Layer                  │
│  - Authentication (JWT validation)               │
│  - Logging (structured logs)                     │
│  - CORS                                          │
│  - Rate limiting                                 │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│                 Service Layer                    │
│  - Business logic                                │
│  - Domain rules                                  │
│  - Transaction management                        │
│  - Circuit breaker + retry                       │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│               Repository Layer                   │
│  - Database queries                              │
│  - Data mapping                                  │
│  - Optimistic locking (version checking)         │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│                Database (PostgreSQL)             │
└──────────────────────────────────────────────────┘
```

### Handler Layer

**Responsibilities**:
- Parse HTTP requests
- Validate request parameters
- Call service methods
- Format responses
- Handle HTTP errors

**Example** (`internal/handler/outcome_measures.go`):

```go
func (h *OutcomeMeasuresHandler) CreateMeasure(c echo.Context) error {
    // 1. Parse request
    var req CreateMeasureRequest
    if err := c.Bind(&req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    // 2. Validate
    if err := c.Validate(&req); err != nil {
        return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
    }

    // 3. Call service
    measure, err := h.service.CreateMeasure(c.Request().Context(), &req)
    if err != nil {
        return handleServiceError(err)
    }

    // 4. Return response
    return c.JSON(http.StatusCreated, measure)
}
```

### Service Layer

**Responsibilities**:
- Business logic
- Transaction coordination
- Domain validation
- Circuit breaker & retry logic

**Example** (`internal/service/outcome_measures_service.go`):

```go
func (s *OutcomeMeasuresService) CreateMeasure(
    ctx context.Context,
    req *CreateMeasureRequest,
) (*OutcomeMeasure, error) {
    // 1. Validate business rules
    if err := s.validateMeasureScore(req); err != nil {
        return nil, ErrInvalidScore
    }

    // 2. Get library definition
    library, err := s.repo.GetLibraryByType(ctx, req.MeasureType)
    if err != nil {
        return nil, err
    }

    // 3. Create measure with retry
    measure := &OutcomeMeasure{
        PatientID:   req.PatientID,
        LibraryID:   library.ID,
        Score:       req.Score,
        MeasuredAt:  req.MeasuredAt,
    }

    err = retry.Do(ctx, func() error {
        return s.repo.Create(ctx, measure)
    })

    return measure, err
}
```

### Repository Layer

**Responsibilities**:
- Database queries
- Connection pooling
- Optimistic locking (version checking)
- Data mapping (DB ↔ Go structs)

**Example** (`internal/repository/outcome_measures_repository.go`):

```go
func (r *OutcomeMeasuresRepository) Update(
    ctx context.Context,
    measure *OutcomeMeasure,
) error {
    query := `
        UPDATE outcome_measures
        SET score = $1, notes = $2, version = version + 1, updated_at = NOW()
        WHERE id = $3 AND version = $4
        RETURNING version
    `

    var newVersion int
    err := r.db.QueryRow(ctx, query,
        measure.Score,
        measure.Notes,
        measure.ID,
        measure.Version, // Optimistic lock check
    ).Scan(&newVersion)

    if err == pgx.ErrNoRows {
        return ErrVersionConflict // 409 Conflict
    }

    measure.Version = newVersion
    return err
}
```

### Circuit Breaker Pattern

Prevents cascading failures by opening circuit when error threshold is reached.

**States**:
- **Closed**: Normal operation, requests pass through
- **Open**: Errors exceeded threshold, reject requests immediately
- **Half-Open**: Test if service recovered, allow limited requests

**Implementation** (`internal/circuitbreaker/circuitbreaker.go`):

```go
type CircuitBreaker struct {
    maxFailures   int           // 5 consecutive failures
    timeout       time.Duration // 30s before retry
    failureCount  int
    state         State // Closed, Open, HalfOpen
    lastFailTime  time.Time
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    if cb.state == Open {
        if time.Since(cb.lastFailTime) > cb.timeout {
            cb.state = HalfOpen // Try recovery
        } else {
            return ErrCircuitOpen
        }
    }

    err := fn()
    if err != nil {
        cb.recordFailure()
    } else {
        cb.recordSuccess()
    }
    return err
}
```

### Retry with Exponential Backoff

Automatically retries transient errors with increasing delays.

**Configuration**:
- Max attempts: 5
- Initial delay: 100ms
- Max delay: 1600ms
- Backoff multiplier: 2

**Retryable errors**:
- Network errors (connection refused, timeout)
- Database deadlocks
- 503 Service Unavailable
- Redis connection errors

**Non-retryable errors**:
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict (version mismatch)
- 422 Unprocessable Entity

## Frontend Architecture

### Web App Structure

The Next.js web app uses App Router with internationalization (i18n).

```
apps/web/src/
├── app/
│   └── [locale]/              # Route segments per locale (vi, en)
│       ├── layout.tsx         # Root layout
│       ├── page.tsx           # Dashboard
│       ├── auth/              # Authentication
│       ├── patients/          # Patient management
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── outcomes/  # Outcome measures
│       └── settings/
│
├── components/
│   ├── ui/                    # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   └── ...
│   ├── anatomy/               # Anatomy region components
│   │   ├── RegionSelector.tsx
│   │   └── AnatomyDiagram.tsx
│   ├── outcome-measures/      # Outcome measure components
│   │   ├── MeasureList.tsx
│   │   ├── MeasureForm.tsx
│   │   ├── ProgressChart.tsx
│   │   └── TrendingView.tsx
│   ├── ErrorBoundary.tsx      # Error handling
│   └── OfflineBanner.tsx      # Offline indicator
│
├── hooks/
│   ├── use-anatomy-regions.ts  # Fetch anatomy data
│   ├── use-outcome-measures.ts # CRUD operations
│   ├── use-online-status.ts    # Network detection
│   └── index.ts
│
├── lib/
│   ├── api.ts                 # API client
│   ├── utils.ts               # cn() helper
│   ├── validations.ts         # Zod schemas
│   └── error-handling.ts      # Error utilities
│
└── types/
    ├── anatomy.ts
    ├── outcome-measures.ts
    └── index.ts
```

### State Management

**Server State** (React Query):
- API data fetching
- Caching (5min stale time, 10min cache time)
- Automatic refetching
- Optimistic updates

**Client State** (Zustand):
- UI state (modals, filters)
- User preferences
- Form state

**Example** (`hooks/use-outcome-measures.ts`):

```typescript
export function useOutcomeMeasures(patientId: string) {
  // Server state: fetch measures
  const { data: measures } = useQuery({
    queryKey: ['outcome-measures', patientId],
    queryFn: () => api.getOutcomeMeasures(patientId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation: create measure with optimistic update
  const createMeasure = useMutation({
    mutationFn: (data: CreateMeasureRequest) =>
      api.createOutcomeMeasure(patientId, data),
    onMutate: async (newMeasure) => {
      // Optimistically update cache
      queryClient.setQueryData(['outcome-measures', patientId], (old) => [
        ...old,
        { ...newMeasure, id: 'temp-id' },
      ]);
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['outcome-measures', patientId], context.previousData);
      toast.error('Failed to create measure');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['outcome-measures', patientId]);
      toast.success('Measure recorded successfully');
    },
  });

  return { measures, createMeasure };
}
```

### Error Handling

**Error Boundary** (`components/ErrorBoundary.tsx`):

Catches React errors and displays fallback UI:

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**API Error Handling** (`lib/error-handling.ts`):

Provides user-friendly messages for API errors:

```typescript
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    switch (status) {
      case 409:
        return 'Version conflict. Please reload and try again.';
      case 404:
        return 'Resource not found.';
      case 422:
        return 'Validation error. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An unexpected error occurred.';
    }
  }
  return 'Network error. Please check your connection.';
}
```

### Offline Support

**Online Status Detection** (`hooks/use-online-status.ts`):

```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

**Offline Banner** (`components/OfflineBanner.tsx`):

Displays when offline:

```typescript
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-500 text-white px-4 py-2">
      ⚠ You are offline. Changes will sync when connection is restored.
    </div>
  );
}
```

## Mobile Architecture

The mobile app uses React Native with Expo and WatermelonDB for offline-first architecture.

### Database Schema (WatermelonDB)

**Models** (`lib/database/models/`):

```typescript
// OutcomeMeasure.ts
class OutcomeMeasure extends Model {
  static table = 'outcome_measures';

  @field('patient_id') patientId: string;
  @field('measure_type') measureType: string;
  @field('score') score: number;
  @date('measured_at') measuredAt: Date;
  @field('_synced') _synced: boolean; // Sync status
  @readonly @date('created_at') createdAt: Date;
}
```

### Sync Queue

**Strategy**:
1. User performs action offline → Save to WatermelonDB
2. Create sync queue entry
3. When online, process queue in order
4. Handle conflicts with version checking

**Implementation** (`lib/sync/outcomeMeasuresSync.ts`):

```typescript
export async function syncOutcomeMeasures() {
  const database = getDatabase();
  const unsyncedMeasures = await database
    .get<OutcomeMeasure>('outcome_measures')
    .query(Q.where('_synced', false))
    .fetch();

  for (const measure of unsyncedMeasures) {
    try {
      // Retry with exponential backoff
      await retryWithBackoff(async () => {
        await api.createOutcomeMeasure(measure.patientId, {
          measure_type: measure.measureType,
          score: measure.score,
          measured_at: measure.measuredAt.toISOString(),
        });
      });

      // Mark as synced
      await database.write(async () => {
        await measure.update((m) => {
          m._synced = true;
        });
      });
    } catch (error) {
      if (error.response?.status === 409) {
        // Version conflict, stop retrying
        console.error('Sync conflict:', error);
        break;
      }
      // Other errors will retry
      throw error;
    }
  }
}
```

## Database Design

### Schema Overview

PhysioFlow uses PostgreSQL 16 with the following key tables:

**Core Tables**:
- `users` - User accounts
- `patients` - Patient records
- `sessions` - Treatment sessions
- `outcome_measures` - Patient outcome measurements (partitioned by year)
- `outcome_measures_library` - Outcome measure definitions

**Vietnamese PT Tables**:
- `bhyt_insurance` - BHYT insurance cards
- `clinical_protocols` - Treatment protocols
- `discharge_summaries` - Discharge documentation

**Reference Tables**:
- `anatomy_regions` - 58 anatomical regions
- `medical_terms_library` - Vietnamese medical terminology

### Partitioning Strategy

**Outcome Measures** table is partitioned by year for performance:

```sql
CREATE TABLE outcome_measures (
    id UUID NOT NULL,
    patient_id UUID NOT NULL,
    measure_type VARCHAR(100) NOT NULL,
    score DECIMAL(10,2),
    measurement_date DATE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (id, measurement_date)
) PARTITION BY RANGE (measurement_date);

CREATE TABLE outcome_measures_2026 PARTITION OF outcome_measures
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE outcome_measures_2027 PARTITION OF outcome_measures
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

**Benefits**:
- Faster queries (partition pruning)
- Easier archival (drop old partitions)
- Better index performance

### Indexes

**Outcome Measures**:
```sql
CREATE INDEX idx_outcome_measures_patient_id
ON outcome_measures (patient_id);

CREATE INDEX idx_outcome_measures_measure_type
ON outcome_measures (measure_type);

CREATE INDEX idx_outcome_measures_patient_type_date
ON outcome_measures (patient_id, measure_type, measurement_date);
```

**Anatomy Regions**:
```sql
CREATE INDEX idx_anatomy_regions_category
ON anatomy_regions (category);

CREATE INDEX idx_anatomy_regions_view
ON anatomy_regions (view);
```

### Optimistic Locking

Prevents concurrent update conflicts using version column:

```sql
UPDATE outcome_measures
SET score = $1, version = version + 1
WHERE id = $2 AND version = $3
RETURNING version;
```

If `version` doesn't match, no rows are updated → return 409 Conflict.

## Authentication Flow

PhysioFlow uses Keycloak for OAuth2/OIDC authentication.

### Login Sequence

```
User                 Web App            Keycloak           API
 │                     │                   │                │
 │  1. Click Login     │                   │                │
 ├──────────────────>  │                   │                │
 │                     │  2. Redirect      │                │
 │                     ├─────────────────> │                │
 │                     │                   │                │
 │  3. Enter credentials                   │                │
 ├─────────────────────────────────────> │                │
 │                     │                   │                │
 │                     │  4. Access token  │                │
 │                     <──────────────────┤                │
 │                     │                   │                │
 │                     │  5. API request + Bearer token    │
 │                     ├───────────────────────────────────>│
 │                     │                   │  6. Validate   │
 │                     │                   <─────────────────│
 │                     │                   │  7. Valid      │
 │                     │                   ├───────────────>│
 │                     │                   │                │
 │                     │  8. Response      │                │
 │                     <──────────────────────────────────────┤
```

### Token Validation

**API validates JWT** using Keycloak's public keys (JWKS):

```go
func (m *AuthMiddleware) ValidateToken(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // 1. Extract token from Authorization header
        authHeader := c.Request().Header.Get("Authorization")
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")

        // 2. Parse and validate JWT
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            // Fetch public key from Keycloak JWKS endpoint
            return m.keycloak.GetPublicKey(token.Header["kid"])
        })

        if err != nil {
            return echo.ErrUnauthorized
        }

        // 3. Extract claims
        claims := token.Claims.(jwt.MapClaims)
        userID := claims["sub"].(string)
        roles := claims["realm_access"].(map[string]interface{})["roles"]

        // 4. Attach to context
        c.Set("user_id", userID)
        c.Set("roles", roles)

        return next(c)
    }
}
```

### Role-Based Access Control (RBAC)

**Roles** (defined in Keycloak):
- `super_admin` - Full system access
- `clinic_admin` - Clinic management
- `therapist` - Patient treatment
- `assistant` - Limited treatment access
- `front_desk` - Patient intake
- `patient` - View own records

**Middleware** checks roles:

```go
func RequireRole(role string) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            roles := c.Get("roles").([]string)
            if !contains(roles, role) {
                return echo.ErrForbidden
            }
            return next(c)
        }
    }
}

// Usage
e.POST("/patients", handler.CreatePatient, RequireRole("therapist"))
```

## Offline Sync Strategy

PhysioFlow uses a **queue-based sync** architecture for offline-first operation.

### Sync Flow

```
┌─────────────────────────────────────────────────┐
│  1. User Action (Create/Update Outcome Measure) │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  2. Save to WatermelonDB (local SQLite)        │
│     Mark _synced = false                        │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  3. Add entry to SyncQueue table               │
│     (type, action, data, priority, retry_count)│
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  4. UI updates immediately (optimistic update) │
└─────────────────────────────────────────────────┘
                      │
                      ▼
        ┌──────────────────────┐
        │   Online?            │
        └──────────────────────┘
                 │         │
            Yes  │         │  No
                 │         │
                 ▼         └──> Wait for reconnection
┌─────────────────────────────────────────────────┐
│  5. Background Sync Worker                     │
│     Process queue in order                     │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  6. Call API with retry + exponential backoff  │
│     Max 5 attempts, 100ms-1600ms delay         │
└─────────────────────────────────────────────────┘
                      │
                      ▼
        ┌──────────────────────┐
        │   Success?           │
        └──────────────────────┘
                 │         │
            Yes  │         │  No (409 Conflict)
                 │         │
                 ▼         └──> Show conflict resolution UI
┌─────────────────────────────────────────────────┐
│  7. Mark _synced = true                        │
│     Remove from SyncQueue                      │
└─────────────────────────────────────────────────┘
```

### Conflict Resolution

**Version Conflicts** (409 response):

1. Fetch latest version from server
2. Show diff to user (local vs server)
3. Let user choose:
   - Keep local changes (overwrite server)
   - Keep server changes (discard local)
   - Merge manually

## Deployment Architecture

### Homelab Deployment (K3s)

PhysioFlow is deployed on a K3s cluster with three environments:

**Cluster**:
- Master: 192.168.10.60
- Worker 1: 192.168.10.61
- Worker 2: 192.168.10.62

**Services**:
- PostgreSQL: LXC 101 (192.168.10.24)
- Keycloak: LXC 104 (192.168.10.27)
- Registry: LXC 101 (192.168.10.25)

**Environments**:
- Dev: `physioflow-dev` namespace, NodePorts 30200-30201
- Staging: `physioflow-staging` namespace, NodePorts 30210-30211
- Prod: `physioflow` namespace, NodePorts 30220-30221

**HAProxy** routes traffic:
- `physioflow-dev.trancloud.work` → NodePort 30200
- `physioflow-staging.trancloud.work` → NodePort 30210
- `physioflow.trancloud.work` → NodePort 30220

### Docker Build

**Web app** (`apps/web/Dockerfile`):

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build args for Next.js NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
CMD ["node_modules/.bin/next", "start"]
```

**API** (`apps/api/Dockerfile`):

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o api cmd/api/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/api .
CMD ["./api"]
```

### Kubernetes Deployment

**Web deployment** (`infrastructure/homelab/k8s/base/deployment-web.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: physioflow-web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: physioflow-web
  template:
    metadata:
      labels:
        app: physioflow-web
    spec:
      containers:
      - name: web
        image: registry.trancloud.work/physioflow-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          valueFrom:
            configMapKeyRef:
              name: physioflow-config
              key: api_url
```

## Summary

PhysioFlow's architecture is designed for:
- **Reliability**: Circuit breakers, retries, optimistic locking
- **Performance**: Caching, connection pooling, database partitioning
- **Offline-first**: WatermelonDB, sync queues, conflict resolution
- **Scalability**: Horizontal scaling, stateless API, load balancing
- **Security**: OAuth2/OIDC, RBAC, encrypted connections

For deployment details, see [Homelab Deployment Guide](../../infrastructure/homelab/QUICK_REFERENCE.md).
