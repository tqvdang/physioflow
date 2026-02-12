# Changelog

All notable changes to PhysioFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Anatomy Regions API
- 58 anatomical regions organized by category (head_neck, upper_limb, trunk, spine, lower_limb)
- Bilingual region names (Vietnamese and English)
- Front/back view support for anatomical diagrams
- Region filtering by category and view
- API endpoint: `GET /api/v1/anatomy/regions`

**Frontend Components**:
- `RegionSelector` component with category grouping
- `AnatomyDiagram` component for visual region selection
- React Query hooks for anatomy regions (`useAnatomyRegions`, `useAnatomyRegion`)

**Mobile Support**:
- `AnatomyRegionPicker` component for React Native
- Offline sync for anatomy data
- WatermelonDB schema for local storage

#### Outcome Measures CRUD Operations
- Full CRUD API for patient outcome measures
- Support for 8 standardized measures (VAS, NDI, ODI, LEFS, DASH, QuickDASH, PSFS, FIM)
- MCID (Minimal Clinically Important Difference) tracking
- Progress calculation (baseline vs current score)
- Trending data for charts
- API endpoints:
  - `POST /api/v1/patients/{id}/outcome-measures` - Record measure
  - `GET /api/v1/patients/{id}/outcome-measures` - List measures
  - `PUT /api/v1/patients/{id}/outcome-measures/{measureId}` - Update measure
  - `DELETE /api/v1/patients/{id}/outcome-measures/{measureId}` - Delete measure
  - `GET /api/v1/patients/{id}/outcome-measures/progress` - Calculate progress
  - `GET /api/v1/patients/{id}/outcome-measures/trending` - Get trending data

**Frontend Components**:
- `MeasureList` component with loading states
- `MeasureForm` for recording/editing measures
- `MeasureEditDialog` for inline editing
- `MeasureDeleteButton` with confirmation
- `ProgressChart` component using Recharts
- `TrendingView` with MCID indicators
- React Query hooks (`useOutcomeMeasures`, `useUpdateOutcomeMeasure`, `useDeleteOutcomeMeasure`)

**Mobile Support**:
- Full CRUD operations in React Native
- WatermelonDB models for offline storage
- Sync queue for background synchronization
- Conflict detection and resolution UI

#### Production Hardening
- **Circuit Breaker Pattern**: Prevents cascading failures (5 failure threshold, 30s timeout, 3 states)
- **Retry with Exponential Backoff**: Automatic retries for transient errors (5 attempts, 100ms-1600ms delay)
- **Optimistic Locking**: Version column for concurrent update detection (returns 409 on conflict)
- **Connection Pooling**: PostgreSQL pool configuration (25 max connections, 5 idle, health checks)
- **Redis Caching**: Graceful degradation for anatomy regions and outcome library (1h TTL)
- **Structured Logging**: Request ID, user ID, operation tracking, slow query detection (>500ms)

**Frontend Hardening**:
- Error boundaries for graceful error handling
- React Query retry configuration (3 retries, exponential backoff)
- Optimistic UI updates with rollback on error
- Error toast notifications with specific messages (409/404/422/500/network errors)
- Offline detection banner (`navigator.onLine` + network change listeners)
- Skeleton loading states

**Mobile Hardening**:
- React Native error boundary
- Offline banner with `@react-native-community/netinfo`
- Sync retry with exponential backoff (5 attempts)
- Version conflict detection (stops retrying on 409)
- Sync error logging with circular buffer

#### Testing
- **Backend Tests**:
  - Circuit breaker tests (10 scenarios: open/close/half-open transitions)
  - Retry tests (6 scenarios + 13 retryable error patterns)
  - Integration tests for anatomy regions (GET all, filter by category/view)
  - Integration tests for outcome measures CRUD (create, update, delete, version conflicts)
  - Performance tests for N+1 query detection

- **Frontend Tests**:
  - Unit tests for anatomy regions hooks (20 test cases)
  - Unit tests for outcome measures hooks (56 test cases including optimistic updates)
  - Component tests for `RegionSelector` (18 test cases)
  - E2E tests for anatomy regions (Playwright)
  - E2E tests for outcome measures CRUD (Playwright)
  - E2E tests for accessibility (ARIA labels, keyboard navigation)

- **Mobile Tests**:
  - E2E tests for anatomy region picker
  - E2E tests for outcome measures offline sync
  - Sync queue retry tests

#### Documentation
- **User Guides**:
  - Outcome Measures user guide (bilingual Vietnamese/English)
  - Anatomy Regions user guide (bilingual)
  - Troubleshooting sections for common issues

- **Developer Guides**:
  - Getting Started guide (prerequisites, setup, running locally)
  - Architecture guide (high-level overview, technology stack, layer diagrams)
  - Production Hardening guide (circuit breaker, retry, optimistic locking, caching)

- **CONTRIBUTING.md**: Contribution guidelines, code style, PR process
- **CHANGELOG.md**: This file

### Changed
- Database migrations now include rollback scripts in `infrastructure/db/migrations/rollback/`
- React Query default configuration updated for better caching and retries
- API error responses now include structured error codes for frontend handling
- Logging middleware enhanced with request ID and slow query detection

### Fixed
- Vietnamese diacritics now properly handled in API responses
- BHYT insurance card validation format corrected for 18 prefix codes
- Race condition in sync queue resolved with optimistic locking

### Migration Notes

**Database Migration Required**:

Run the following migration to add version column for optimistic locking:

```bash
cd infrastructure/db
psql -U emr -h localhost -p 7012 -d physioflow -f migrations/026_add_version_column.sql
```

**Rollback** (if needed):

```bash
psql -U emr -h localhost -p 7012 -d physioflow -f migrations/rollback/026_down.sql
```

**Environment Variables**:

No new environment variables required. Existing Infisical configuration covers all settings.

**Breaking Changes**:

None. All changes are backward-compatible additions.

## [1.0.0] - 2026-01-15

### Added
- Initial release of PhysioFlow EHR system
- Patient management CRUD operations
- Treatment session tracking
- BHYT insurance integration (18 prefix codes, 8 beneficiary categories)
- Clinical protocols (5 evidence-based protocols)
- Discharge planning with bilingual summaries
- Medical terminology library (56 Vietnamese terms)
- Keycloak authentication with RBAC (6 roles)
- Docker Compose development environment
- K3s homelab deployment (dev/staging/prod environments)
- Comprehensive API documentation
- E2E test suite with Playwright

### Technical Stack
- **Frontend**: Next.js 14, TypeScript, shadcn/ui, React Query, Zustand
- **Mobile**: React Native (Expo SDK 50), WatermelonDB
- **Backend**: Go 1.22, Echo v4, PostgreSQL 16, Redis 7
- **Infrastructure**: Docker, Kubernetes (K3s), Keycloak, MinIO, Meilisearch

---

## Version History

- **[Unreleased]** - Current development (anatomy regions, outcome measures, production hardening)
- **[1.0.0]** - 2026-01-15 - Initial release

## Links

- [Documentation](./docs/)
- [API Reference](./docs/api/)
- [User Guides](./docs/user-guides/)
- [Developer Guides](./docs/developer-guides/)
- [Contributing Guidelines](./CONTRIBUTING.md)
