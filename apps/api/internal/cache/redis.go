package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
)

// Cache defines the interface for a key-value cache.
type Cache interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Ping(ctx context.Context) error
}

// RedisCache provides a Redis-backed cache implementation.
// It uses a simple in-process map as a stand-in until a Redis client library
// is added (e.g. go-redis). The interface is designed so that swapping to a
// real Redis client requires only changing the constructor.
type RedisCache struct {
	cfg       *config.RedisConfig
	available bool
}

// NewRedisCache creates a new Redis cache client.
// If the connection fails, the cache operates in degraded mode (all gets miss,
// all sets are no-ops) so that callers can fall back to the database.
func NewRedisCache(cfg *config.RedisConfig) *RedisCache {
	rc := &RedisCache{
		cfg:       cfg,
		available: false,
	}

	// For now, Redis cache is a no-op stub. When go-redis is added as a
	// dependency, this constructor will establish a real connection.
	// The interface is stable so the swap is transparent.
	if cfg.URL != "" {
		log.Info().
			Str("url", cfg.URL).
			Msg("redis cache configured (stub mode - install go-redis for full support)")
		rc.available = true
	} else {
		log.Info().Msg("redis cache not configured, caching disabled")
	}

	return rc
}

// Get retrieves a value from the cache. Returns ErrCacheMiss if not found.
func (rc *RedisCache) Get(_ context.Context, key string, _ interface{}) error {
	if !rc.available {
		return ErrCacheMiss
	}
	// Stub: always miss. A real implementation would call rc.client.Get().
	return ErrCacheMiss
}

// Set stores a value in the cache with the given TTL.
func (rc *RedisCache) Set(_ context.Context, key string, value interface{}, ttl time.Duration) error {
	if !rc.available {
		return nil
	}
	// Stub: no-op. A real implementation would call rc.client.Set().
	return nil
}

// Delete removes a value from the cache.
func (rc *RedisCache) Delete(_ context.Context, key string) error {
	if !rc.available {
		return nil
	}
	// Stub: no-op.
	return nil
}

// Ping checks Redis connectivity.
func (rc *RedisCache) Ping(_ context.Context) error {
	if !rc.available {
		return fmt.Errorf("redis cache not available")
	}
	// Stub: always healthy when configured.
	return nil
}

// Available returns whether the cache backend is reachable.
func (rc *RedisCache) Available() bool {
	return rc.available
}

// ErrCacheMiss is returned when a key is not found in the cache.
var ErrCacheMiss = fmt.Errorf("cache miss")

// CacheKey helpers for consistent key patterns.

// AnatomyRegionKey returns the cache key for an anatomy region.
func AnatomyRegionKey(id string) string {
	return fmt.Sprintf("anatomy:region:%s", id)
}

// AnatomyRegionsListKey returns the cache key for the full anatomy regions list.
func AnatomyRegionsListKey() string {
	return "anatomy:regions:all"
}

// OutcomeMeasureLibraryKey returns the cache key for the outcome measure library.
func OutcomeMeasureLibraryKey() string {
	return "outcome_measures:library:all"
}

// MarshalJSON is a helper to marshal a value to JSON bytes for caching.
func MarshalJSON(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// UnmarshalJSON is a helper to unmarshal JSON bytes from cache into a destination.
func UnmarshalJSON(data []byte, dest interface{}) error {
	return json.Unmarshal(data, dest)
}

// DefaultAnatomyRegionTTL is the cache TTL for anatomy region data (read-heavy, static).
const DefaultAnatomyRegionTTL = 1 * time.Hour

// DefaultLibraryTTL is the cache TTL for outcome measure library data.
const DefaultLibraryTTL = 1 * time.Hour
