package retry

import (
	"context"
	"errors"
	"math"
	"net"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// Config holds configuration for retry behavior.
type Config struct {
	// MaxRetries is the maximum number of retry attempts.
	MaxRetries int
	// BaseDelay is the initial delay before the first retry.
	BaseDelay time.Duration
	// MaxDelay caps the maximum delay between retries.
	MaxDelay time.Duration
	// Multiplier is the exponential backoff multiplier.
	Multiplier float64
}

// DefaultConfig returns a Config with sensible defaults:
// 5 retries, 100ms base delay, 1600ms max delay, 2x multiplier.
// This produces delays: 100ms, 200ms, 400ms, 800ms, 1600ms.
func DefaultConfig() Config {
	return Config{
		MaxRetries: 5,
		BaseDelay:  100 * time.Millisecond,
		MaxDelay:   1600 * time.Millisecond,
		Multiplier: 2.0,
	}
}

// Do executes the function with exponential backoff retry for transient errors.
// It respects context cancellation and only retries on retryable errors.
func Do(ctx context.Context, cfg Config, operation string, fn func() error) error {
	var lastErr error

	for attempt := 0; attempt <= cfg.MaxRetries; attempt++ {
		lastErr = fn()
		if lastErr == nil {
			if attempt > 0 {
				log.Info().
					Str("operation", operation).
					Int("attempt", attempt+1).
					Msg("retry succeeded")
			}
			return nil
		}

		// Don't retry if not a transient error.
		if !IsRetryable(lastErr) {
			return lastErr
		}

		// Don't retry if we've exhausted attempts.
		if attempt >= cfg.MaxRetries {
			break
		}

		// Calculate delay with exponential backoff.
		delay := calculateDelay(cfg, attempt)

		log.Warn().
			Err(lastErr).
			Str("operation", operation).
			Int("attempt", attempt+1).
			Int("max_retries", cfg.MaxRetries).
			Dur("next_delay", delay).
			Msg("operation failed, retrying")

		// Wait for the delay or context cancellation.
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}
	}

	return lastErr
}

// calculateDelay computes the delay for a given attempt using exponential backoff.
func calculateDelay(cfg Config, attempt int) time.Duration {
	delay := float64(cfg.BaseDelay) * math.Pow(cfg.Multiplier, float64(attempt))
	if delay > float64(cfg.MaxDelay) {
		delay = float64(cfg.MaxDelay)
	}
	return time.Duration(delay)
}

// IsRetryable determines if an error is transient and worth retrying.
func IsRetryable(err error) bool {
	if err == nil {
		return false
	}

	// Context errors are not retryable.
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}

	// Network errors (connection refused, timeout, etc.) are retryable.
	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}

	// Connection-related errors (string matching as fallback).
	msg := err.Error()
	retryablePatterns := []string{
		"connection refused",
		"connection reset",
		"connection timed out",
		"no such host",
		"i/o timeout",
		"broken pipe",
		"EOF",
		"503",
		"429",
		"too many connections",
		"server is shutting down",
		"pq: the database system is starting up",
		"pq: the database system is shutting down",
		"pq: sorry, too many clients already",
	}

	for _, pattern := range retryablePatterns {
		if strings.Contains(msg, pattern) {
			return true
		}
	}

	return false
}
