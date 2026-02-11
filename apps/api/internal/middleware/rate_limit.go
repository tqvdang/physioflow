package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

// rateLimitEntry tracks request counts per key in a sliding window.
type rateLimitEntry struct {
	count     int
	expiresAt time.Time
}

// inMemoryRateLimiter is a simple in-memory rate limiter.
// In production, this should be backed by Redis using INCR + EXPIRE.
type inMemoryRateLimiter struct {
	mu      sync.Mutex
	entries map[string]*rateLimitEntry
}

var (
	limiterInstance *inMemoryRateLimiter
	limiterOnce     sync.Once
)

func getRateLimiter() *inMemoryRateLimiter {
	limiterOnce.Do(func() {
		limiterInstance = &inMemoryRateLimiter{
			entries: make(map[string]*rateLimitEntry),
		}
		// Start cleanup goroutine
		go limiterInstance.cleanup()
	})
	return limiterInstance
}

func (rl *inMemoryRateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, entry := range rl.entries {
			if now.After(entry.expiresAt) {
				delete(rl.entries, key)
			}
		}
		rl.mu.Unlock()
	}
}

// allow checks if a request for the given key is within the rate limit.
// Returns (allowed, current count, remaining).
func (rl *inMemoryRateLimiter) allow(key string, limit int, window time.Duration) (bool, int, int) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	entry, exists := rl.entries[key]

	if !exists || now.After(entry.expiresAt) {
		// New window
		rl.entries[key] = &rateLimitEntry{
			count:     1,
			expiresAt: now.Add(window),
		}
		return true, 1, limit - 1
	}

	entry.count++
	if entry.count > limit {
		return false, entry.count, 0
	}

	return true, entry.count, limit - entry.count
}

// RateLimit returns a middleware that limits requests per key within a time window.
// The key is derived from the authenticated user ID, falling back to the client IP.
//
// In production, replace the in-memory store with Redis:
//
//	key := fmt.Sprintf("ratelimit:%s:%s", prefix, userID)
//	count, _ := redisClient.Incr(ctx, key).Result()
//	if count == 1 { redisClient.Expire(ctx, key, window) }
func RateLimit(limit int, window time.Duration) echo.MiddlewareFunc {
	rl := getRateLimiter()

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Build rate limit key from user ID or IP
			key := c.RealIP()
			if user := GetUser(c); user != nil {
				key = user.UserID
			}
			key = fmt.Sprintf("rl:%s:%s", c.Path(), key)

			allowed, _, remaining := rl.allow(key, limit, window)

			// Set standard rate limit headers
			c.Response().Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			c.Response().Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

			if !allowed {
				log.Warn().
					Str("key", key).
					Int("limit", limit).
					Dur("window", window).
					Msg("rate limit exceeded")

				c.Response().Header().Set("Retry-After", strconv.Itoa(int(window.Seconds())))
				return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
					"error":   "rate_limit_exceeded",
					"message": fmt.Sprintf("Rate limit exceeded. Maximum %d requests per %s.", limit, window),
				})
			}

			return next(c)
		}
	}
}
