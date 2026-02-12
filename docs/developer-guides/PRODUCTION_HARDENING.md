# Developer Guide: Production Hardening

This guide documents the production hardening features implemented in PhysioFlow for resilience, performance, and error handling.

## Table of Contents

- [Overview](#overview)
- [Circuit Breaker Pattern](#circuit-breaker-pattern)
- [Retry Mechanisms](#retry-mechanisms)
- [Optimistic Locking](#optimistic-locking)
- [Caching Strategy](#caching-strategy)
- [Connection Pooling](#connection-pooling)
- [Error Boundaries](#error-boundaries)
- [Offline Detection](#offline-detection)
- [Optimistic UI Updates](#optimistic-ui-updates)
- [Logging and Monitoring](#logging-and-monitoring)

## Overview

PhysioFlow implements multiple layers of production hardening to ensure reliability in real-world clinical environments.

### Hardening Goals

1. **Resilience**: Handle failures gracefully without cascading
2. **Performance**: Fast response times through caching and connection pooling
3. **Data Integrity**: Prevent concurrent update conflicts with optimistic locking
4. **User Experience**: Provide clear error messages and offline support
5. **Observability**: Structured logging for debugging and monitoring

### Coverage

**Backend** (Go API):
- Circuit breaker pattern
- Retry with exponential backoff
- Optimistic locking (version column)
- Connection pooling
- Redis cache with graceful degradation
- Structured logging with slow query detection

**Frontend** (Web):
- Error boundaries
- React Query configuration (retries, caching)
- Optimistic UI updates with rollback
- Error toast notifications
- Offline detection banner

**Mobile** (React Native):
- Error boundary for React Native
- Offline banner with network detection
- Sync retry with exponential backoff
- Version conflict handling

## Circuit Breaker Pattern

The circuit breaker prevents cascading failures by "opening" the circuit when errors exceed a threshold.

### States

```
        ┌──────────────────────────────────────┐
        │           CLOSED                     │
        │  Normal operation                    │
        │  Requests pass through               │
        └──────────────────────────────────────┘
                      │
                      │ Failures >= Threshold (5)
                      ▼
        ┌──────────────────────────────────────┐
        │             OPEN                     │
        │  Reject all requests immediately     │
        │  Return error without calling service│
        └──────────────────────────────────────┘
                      │
                      │ Timeout elapsed (30s)
                      ▼
        ┌──────────────────────────────────────┐
        │          HALF-OPEN                   │
        │  Allow limited requests to test      │
        │  if service recovered                │
        └──────────────────────────────────────┘
                      │
            ┌─────────┴──────────┐
            │                    │
       Success                Failure
            │                    │
            ▼                    ▼
        CLOSED                 OPEN
```

### Configuration

**Backend** (`internal/circuitbreaker/circuitbreaker.go`):

```go
const (
    DefaultMaxFailures = 5              // Consecutive failures before opening
    DefaultTimeout     = 30 * time.Second // Wait before half-open
)

type CircuitBreaker struct {
    maxFailures  int
    timeout      time.Duration
    failureCount int
    state        State
    lastFailTime time.Time
    mu           sync.RWMutex
}
```

### Usage

**Example**: Wrap database calls with circuit breaker:

```go
func (r *OutcomeMeasuresRepository) GetAll(ctx context.Context, patientID string) ([]OutcomeMeasure, error) {
    var measures []OutcomeMeasure

    err := r.circuitBreaker.Call(func() error {
        query := `SELECT * FROM outcome_measures WHERE patient_id = $1`
        rows, err := r.db.Query(ctx, query, patientID)
        if err != nil {
            return err
        }
        defer rows.Close()

        for rows.Next() {
            var m OutcomeMeasure
            if err := rows.Scan(&m.ID, &m.PatientID, ...); err != nil {
                return err
            }
            measures = append(measures, m)
        }
        return rows.Err()
    })

    if err == circuitbreaker.ErrCircuitOpen {
        // Circuit is open, return cached data or error
        return nil, errors.New("service temporarily unavailable")
    }

    return measures, err
}
```

### Benefits

- Prevents overwhelming a failing service with requests
- Fast-fail when service is down (no waiting for timeouts)
- Automatic recovery testing (half-open state)
- Reduces load on downstream services

### Monitoring

Circuit breaker state changes are logged:

```json
{
  "level": "warn",
  "msg": "Circuit breaker opened",
  "service": "outcome_measures_repository",
  "consecutive_failures": 5,
  "last_error": "connection refused"
}
```

## Retry Mechanisms

Automatic retries with exponential backoff for transient errors.

### Configuration

**Backend** (`internal/retry/retry.go`):

```go
const (
    MaxAttempts    = 5
    InitialDelay   = 100 * time.Millisecond
    MaxDelay       = 1600 * time.Millisecond
    BackoffFactor  = 2
)
```

**Delay progression**:
- Attempt 1: 100ms
- Attempt 2: 200ms
- Attempt 3: 400ms
- Attempt 4: 800ms
- Attempt 5: 1600ms

### Retryable Errors

Only retry transient errors that might succeed on retry:

**Network errors**:
- `connection refused`
- `connection reset`
- `timeout`
- `no such host`
- `network unreachable`

**Database errors**:
- `deadlock detected`
- `connection reset by peer`
- `could not serialize access`

**HTTP status codes**:
- `503 Service Unavailable`
- `504 Gateway Timeout`

### Non-Retryable Errors

Do NOT retry errors that will fail again:

**Client errors**:
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict` (version mismatch)
- `422 Unprocessable Entity`

**Server errors**:
- `500 Internal Server Error` (unless transient)

### Usage

**Example**: Retry database insert:

```go
import "github.com/yourusername/physioflow/apps/api/internal/retry"

func (r *Repository) Create(ctx context.Context, measure *OutcomeMeasure) error {
    err := retry.Do(ctx, func() error {
        query := `INSERT INTO outcome_measures (...) VALUES (...)`
        _, err := r.db.Exec(ctx, query, ...)
        return err
    })

    if err != nil {
        // All retries failed
        return fmt.Errorf("failed to create measure after %d attempts: %w", retry.MaxAttempts, err)
    }
    return nil
}
```

**With custom configuration**:

```go
err := retry.DoWithConfig(ctx, retry.Config{
    MaxAttempts:   3,
    InitialDelay:  50 * time.Millisecond,
    MaxDelay:      500 * time.Millisecond,
    BackoffFactor: 2,
}, func() error {
    return api.Call()
})
```

### Frontend Retry (React Query)

**Web app** (`apps/web/src/app/providers.tsx`):

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1, // Only retry once for mutations
    },
  },
});
```

### Mobile Retry (Sync Queue)

**Mobile app** (`apps/mobile/lib/sync/outcomeMeasuresSync.ts`):

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry version conflicts
      if (error.response?.status === 409) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(100 * 2 ** attempt, 1600);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Optimistic Locking

Prevents concurrent update conflicts using a version column.

### Database Schema

**Version column** added to `outcome_measures`:

```sql
-- Migration: 026_add_version_column.sql
ALTER TABLE outcome_measures
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_outcome_measures_version
ON outcome_measures (id, version);
```

### Update Logic

**Repository** (`internal/repository/outcome_measures_repository.go`):

```go
func (r *OutcomeMeasuresRepository) Update(ctx context.Context, measure *OutcomeMeasure) error {
    query := `
        UPDATE outcome_measures
        SET
            score = $1,
            notes = $2,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $3 AND version = $4
        RETURNING version
    `

    var newVersion int
    err := r.db.QueryRow(ctx, query,
        measure.Score,
        measure.Notes,
        measure.ID,
        measure.Version, // <-- Check current version
    ).Scan(&newVersion)

    if err == pgx.ErrNoRows {
        // Version mismatch = another user updated this record
        return ErrVersionConflict // Returns 409 Conflict
    }

    if err != nil {
        return err
    }

    // Update in-memory object with new version
    measure.Version = newVersion
    return nil
}
```

### Frontend Handling

**Web app** (`hooks/use-outcome-measures.ts`):

```typescript
const updateMeasure = useMutation({
  mutationFn: async (data: UpdateMeasureRequest) => {
    try {
      return await api.updateOutcomeMeasure(measureId, data);
    } catch (error) {
      if (error.response?.status === 409) {
        // Version conflict
        toast.error(
          'This measure was updated by another user. Please reload and try again.',
          { duration: 5000 }
        );
        // Invalidate cache to force refetch
        queryClient.invalidateQueries(['outcome-measures', patientId]);
      }
      throw error;
    }
  },
});
```

### Conflict Resolution Flow

```
User A fetches measure (version: 1)
User B fetches measure (version: 1)
                │
                │
User A updates score → version: 2 ✓ Success
                │
                ▼
User B updates score → version: 1 ✗ Conflict (409)
                │
                ▼
        Show error dialog:
        "This measure was updated by another user"
                │
                ▼
        Options:
        1. Reload and retry
        2. View changes
        3. Cancel
```

### Benefits

- Prevents lost updates (two users editing same record)
- No database locks required (better performance)
- Clear error messages for users
- Automatic conflict detection

## Caching Strategy

Redis caching with graceful degradation for frequently accessed data.

### Implementation

**Cache client** (`internal/cache/redis.go`):

```go
type RedisCache struct {
    client *redis.Client
}

func (c *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
    val, err := c.client.Get(ctx, key).Result()
    if err == redis.Nil {
        return ErrCacheMiss
    }
    if err != nil {
        // Redis unavailable, degrade gracefully
        return ErrCacheUnavailable
    }
    return json.Unmarshal([]byte(val), dest)
}

func (c *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }

    err = c.client.Set(ctx, key, data, ttl).Err()
    if err != nil {
        // Log error but don't fail the request
        log.Warn().Err(err).Msg("Failed to set cache")
    }
    return nil // Always return nil to not break caller
}
```

### Usage with Graceful Degradation

**Repository** (`internal/repository/outcome_measures_repository.go`):

```go
func (r *OutcomeMeasuresRepository) GetLibrary(ctx context.Context) ([]OutcomeMeasureLibrary, error) {
    cacheKey := "outcome_measures:library"

    // Try cache first
    var library []OutcomeMeasureLibrary
    err := r.cache.Get(ctx, cacheKey, &library)
    if err == nil {
        // Cache hit
        return library, nil
    }

    // Cache miss or unavailable, fetch from database
    library, err = r.fetchLibraryFromDB(ctx)
    if err != nil {
        return nil, err
    }

    // Try to cache (fire-and-forget)
    go func() {
        _ = r.cache.Set(context.Background(), cacheKey, library, 1*time.Hour)
    }()

    return library, nil
}
```

### Cache Keys

**Anatomy regions**:
- Key: `anatomy:regions:all`
- TTL: 1 hour
- Invalidation: Manual (when regions are updated)

**Outcome measures library**:
- Key: `outcome_measures:library`
- TTL: 1 hour
- Invalidation: Manual (when library is updated)

**Patient measures**:
- Key: `outcome_measures:patient:{patient_id}`
- TTL: 5 minutes
- Invalidation: On create/update/delete

### Benefits

- Reduced database load for frequently accessed data
- Faster response times (cache hit ~1ms vs DB query ~50ms)
- Graceful degradation (works without Redis)
- Automatic expiration (TTL)

## Connection Pooling

PostgreSQL connection pooling for efficient resource usage.

### Configuration

**Backend** (`internal/repository/postgres.go`):

```go
func NewPostgresDB(dsn string) (*pgxpool.Pool, error) {
    config, err := pgxpool.ParseConfig(dsn)
    if err != nil {
        return nil, err
    }

    // Connection pool settings
    config.MaxConns = 25                       // Max open connections
    config.MinConns = 5                        // Keep-alive connections
    config.MaxConnLifetime = 5 * time.Minute   // Recycle connections
    config.MaxConnIdleTime = 10 * time.Minute  // Close idle connections
    config.HealthCheckPeriod = 1 * time.Minute // Check connection health

    pool, err := pgxpool.NewWithConfig(context.Background(), config)
    if err != nil {
        return nil, err
    }

    return pool, nil
}
```

### Benefits

- Reuse connections (avoid TCP handshake overhead)
- Limit max connections (prevent exhausting DB resources)
- Automatic health checks (detect broken connections)
- Connection recycling (prevent stale connections)

### Monitoring

Pool stats can be queried:

```go
func (r *Repository) GetPoolStats() *pgxpool.Stat {
    return r.pool.Stat()
}

// Stats include:
// - AcquireCount: Total connections acquired
// - AcquiredConns: Currently in-use connections
// - IdleConns: Available idle connections
// - MaxConns: Max allowed connections
```

## Error Boundaries

Catch and handle React errors gracefully.

### Implementation

**Web app** (`components/ErrorBoundary.tsx`):

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
    // Could send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We encountered an unexpected error. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Usage

**Wrap app** (`app/[locale]/layout.tsx`):

```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Mobile app** (`components/ErrorBoundary.tsx`):

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Button title="Retry" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}
```

## Offline Detection

Detect network status and show offline banner.

### Web Implementation

**Hook** (`hooks/use-online-status.ts`):

```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

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

**Banner component** (`components/OfflineBanner.tsx`):

```typescript
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-500 text-white px-4 py-2 text-center">
      You are offline. Changes will sync when connection is restored.
    </div>
  );
}
```

### Mobile Implementation

**Using NetInfo** (`app/_layout.tsx`):

```typescript
import NetInfo from '@react-native-community/netinfo';

export default function RootLayout() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline</Text>
        </View>
      )}
      <Stack />
    </>
  );
}
```

## Optimistic UI Updates

Update UI immediately, rollback on error.

### Implementation

**Web app** (`hooks/use-outcome-measures.ts`):

```typescript
const createMeasure = useMutation({
  mutationFn: (data: CreateMeasureRequest) =>
    api.createOutcomeMeasure(patientId, data),

  // 1. Optimistically update UI before API call
  onMutate: async (newMeasure) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['outcome-measures', patientId]);

    // Snapshot current data
    const previousMeasures = queryClient.getQueryData(['outcome-measures', patientId]);

    // Optimistically update cache
    queryClient.setQueryData(['outcome-measures', patientId], (old: any[]) => [
      ...old,
      { ...newMeasure, id: 'temp-id', _pending: true },
    ]);

    // Return context with snapshot
    return { previousMeasures };
  },

  // 2. If API call fails, rollback
  onError: (error, variables, context) => {
    queryClient.setQueryData(
      ['outcome-measures', patientId],
      context.previousMeasures
    );
    toast.error(getErrorMessage(error));
  },

  // 3. On success, invalidate to fetch real data
  onSuccess: () => {
    queryClient.invalidateQueries(['outcome-measures', patientId]);
    toast.success('Measure recorded successfully');
  },
});
```

### Benefits

- Instant UI feedback (no waiting for API)
- Better user experience (feels fast)
- Automatic rollback on errors
- Real data replaces optimistic data on success

## Logging and Monitoring

Structured logging for debugging and observability.

### Structured Logging

**Backend** (`internal/middleware/logger.go`):

```go
func LoggerMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        start := time.Now()

        // Extract context
        requestID := c.Response().Header().Get(echo.HeaderXRequestID)
        userID := c.Get("user_id")

        // Create logger with context
        logger := log.With().
            Str("request_id", requestID).
            Str("method", c.Request().Method).
            Str("path", c.Request().URL.Path).
            Str("user_id", fmt.Sprintf("%v", userID)).
            Logger()

        // Process request
        err := next(c)

        // Log result
        duration := time.Since(start)
        status := c.Response().Status

        logEvent := logger.Info()
        if status >= 400 {
            logEvent = logger.Error()
        }

        logEvent.
            Int("status", status).
            Dur("duration_ms", duration).
            Err(err).
            Msg("request completed")

        return err
    }
}
```

### Slow Query Logging

**Repository** (`internal/repository/outcome_measures_repository.go`):

```go
const SlowQueryThreshold = 500 * time.Millisecond

func (r *Repository) logSlowQuery(query string, duration time.Duration) {
    if duration > SlowQueryThreshold {
        log.Warn().
            Str("query", query).
            Dur("duration_ms", duration).
            Msg("slow query detected")
    }
}

func (r *Repository) GetAll(ctx context.Context, patientID string) ([]OutcomeMeasure, error) {
    start := time.Now()

    query := `SELECT * FROM outcome_measures WHERE patient_id = $1`
    rows, err := r.db.Query(ctx, query, patientID)

    r.logSlowQuery(query, time.Since(start))

    // ... rest of function
}
```

### Log Levels

- **Debug**: Detailed diagnostic info (disabled in production)
- **Info**: Normal operations (requests, responses)
- **Warn**: Potentially harmful situations (slow queries, cache misses, circuit open)
- **Error**: Error events that might still allow the app to continue
- **Fatal**: Severe errors that cause termination

### Sample Log Output

```json
{
  "level": "info",
  "request_id": "a1b2c3d4",
  "method": "POST",
  "path": "/api/v1/patients/123/outcome-measures",
  "user_id": "user_456",
  "status": 201,
  "duration_ms": 45,
  "timestamp": "2026-02-11T10:30:00Z",
  "message": "request completed"
}
```

```json
{
  "level": "warn",
  "query": "SELECT * FROM outcome_measures WHERE patient_id = $1",
  "duration_ms": 650,
  "timestamp": "2026-02-11T10:30:00Z",
  "message": "slow query detected"
}
```

## Testing Production Hardening

### Circuit Breaker Tests

**Backend** (`internal/circuitbreaker/circuitbreaker_test.go`):

```go
func TestCircuitBreaker_OpensAfterFailures(t *testing.T) {
    cb := NewCircuitBreaker(3, 1*time.Second)

    // Fail 3 times
    for i := 0; i < 3; i++ {
        err := cb.Call(func() error {
            return errors.New("fail")
        })
        assert.Error(t, err)
    }

    // Circuit should be open
    assert.Equal(t, Open, cb.GetState())

    // Next call should fail immediately
    err := cb.Call(func() error {
        return nil
    })
    assert.Equal(t, ErrCircuitOpen, err)
}
```

### Retry Tests

**Backend** (`internal/retry/retry_test.go`):

```go
func TestRetry_RetriesTransientErrors(t *testing.T) {
    attempts := 0

    err := Do(context.Background(), func() error {
        attempts++
        if attempts < 3 {
            return errors.New("connection refused") // Retryable
        }
        return nil
    })

    assert.NoError(t, err)
    assert.Equal(t, 3, attempts)
}

func TestRetry_DoesNotRetryPermanentErrors(t *testing.T) {
    attempts := 0

    err := Do(context.Background(), func() error {
        attempts++
        return errors.New("validation error") // Non-retryable
    })

    assert.Error(t, err)
    assert.Equal(t, 1, attempts) // Should not retry
}
```

### Optimistic Update Tests

**Frontend** (`hooks/__tests__/use-outcome-measures.test.ts`):

```typescript
test('optimistically updates UI and rolls back on error', async () => {
  const { result } = renderHook(() => useOutcomeMeasures('patient-123'));

  // Mock API to fail
  mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

  // Trigger mutation
  await result.current.createMeasure.mutateAsync({
    measure_type: 'ndi',
    score: 20,
  });

  // Should show error and rollback
  expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
});
```

## Summary

PhysioFlow's production hardening ensures:

- **Resilience**: Circuit breakers prevent cascading failures
- **Performance**: Caching and connection pooling optimize speed
- **Data Integrity**: Optimistic locking prevents conflicts
- **User Experience**: Offline support and optimistic updates
- **Observability**: Structured logging for debugging

For implementation details, see:
- Circuit Breaker: `apps/api/internal/circuitbreaker/`
- Retry: `apps/api/internal/retry/`
- Caching: `apps/api/internal/cache/`
- Error Boundaries: `apps/web/src/components/ErrorBoundary.tsx`
- Offline Detection: `apps/web/src/hooks/use-online-status.ts`
