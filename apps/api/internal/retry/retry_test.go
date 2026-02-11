package retry

import (
	"context"
	"errors"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestDo_SucceedsImmediately(t *testing.T) {
	cfg := DefaultConfig()
	calls := 0

	err := Do(context.Background(), cfg, "test-op", func() error {
		calls++
		return nil
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, calls)
}

func TestDo_RetriesOnTransientError(t *testing.T) {
	cfg := Config{
		MaxRetries: 3,
		BaseDelay:  1 * time.Millisecond,
		MaxDelay:   10 * time.Millisecond,
		Multiplier: 2.0,
	}

	calls := 0
	transientErr := errors.New("connection refused")

	err := Do(context.Background(), cfg, "test-op", func() error {
		calls++
		if calls < 3 {
			return transientErr
		}
		return nil
	})

	assert.NoError(t, err)
	assert.Equal(t, 3, calls)
}

func TestDo_StopsOnNonRetryableError(t *testing.T) {
	cfg := Config{
		MaxRetries: 5,
		BaseDelay:  1 * time.Millisecond,
		MaxDelay:   10 * time.Millisecond,
		Multiplier: 2.0,
	}

	calls := 0
	nonRetryableErr := errors.New("invalid input data")

	err := Do(context.Background(), cfg, "test-op", func() error {
		calls++
		return nonRetryableErr
	})

	assert.Error(t, err)
	assert.Equal(t, 1, calls) // Should stop after first attempt.
}

func TestDo_ExhaustsRetries(t *testing.T) {
	cfg := Config{
		MaxRetries: 3,
		BaseDelay:  1 * time.Millisecond,
		MaxDelay:   10 * time.Millisecond,
		Multiplier: 2.0,
	}

	calls := 0
	transientErr := errors.New("connection refused")

	err := Do(context.Background(), cfg, "test-op", func() error {
		calls++
		return transientErr
	})

	assert.Error(t, err)
	assert.Equal(t, 4, calls) // 1 initial + 3 retries.
}

func TestDo_RespectsContextCancellation(t *testing.T) {
	cfg := Config{
		MaxRetries: 10,
		BaseDelay:  100 * time.Millisecond,
		MaxDelay:   1 * time.Second,
		Multiplier: 2.0,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	transientErr := errors.New("connection refused")

	err := Do(ctx, cfg, "test-op", func() error {
		return transientErr
	})

	assert.Error(t, err)
	// Should have been cancelled before exhausting all retries.
}

func TestCalculateDelay(t *testing.T) {
	cfg := Config{
		BaseDelay:  100 * time.Millisecond,
		MaxDelay:   1600 * time.Millisecond,
		Multiplier: 2.0,
	}

	tests := []struct {
		attempt  int
		expected time.Duration
	}{
		{0, 100 * time.Millisecond},
		{1, 200 * time.Millisecond},
		{2, 400 * time.Millisecond},
		{3, 800 * time.Millisecond},
		{4, 1600 * time.Millisecond},
		{5, 1600 * time.Millisecond}, // Capped at MaxDelay.
	}

	for _, tt := range tests {
		delay := calculateDelay(cfg, tt.attempt)
		assert.Equal(t, tt.expected, delay, "attempt %d", tt.attempt)
	}
}

func TestIsRetryable(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name:     "nil error",
			err:      nil,
			expected: false,
		},
		{
			name:     "context canceled",
			err:      context.Canceled,
			expected: false,
		},
		{
			name:     "context deadline exceeded",
			err:      context.DeadlineExceeded,
			expected: false,
		},
		{
			name:     "connection refused",
			err:      errors.New("connection refused"),
			expected: true,
		},
		{
			name:     "connection reset",
			err:      errors.New("connection reset by peer"),
			expected: true,
		},
		{
			name:     "too many connections",
			err:      errors.New("pq: sorry, too many clients already"),
			expected: true,
		},
		{
			name:     "database starting up",
			err:      errors.New("pq: the database system is starting up"),
			expected: true,
		},
		{
			name:     "generic business error",
			err:      errors.New("patient not found"),
			expected: false,
		},
		{
			name:     "validation error",
			err:      errors.New("invalid score range"),
			expected: false,
		},
		{
			name:     "EOF error",
			err:      errors.New("unexpected EOF"),
			expected: true,
		},
		{
			name:     "503 service unavailable",
			err:      errors.New("HTTP 503 service unavailable"),
			expected: true,
		},
		{
			name:     "429 too many requests",
			err:      errors.New("HTTP 429 too many requests"),
			expected: true,
		},
		{
			name:     "net.Error (timeout)",
			err:      &net.OpError{Op: "dial", Err: &net.DNSError{IsTimeout: true}},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, IsRetryable(tt.err))
		})
	}
}

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()

	assert.Equal(t, 5, cfg.MaxRetries)
	assert.Equal(t, 100*time.Millisecond, cfg.BaseDelay)
	assert.Equal(t, 1600*time.Millisecond, cfg.MaxDelay)
	assert.Equal(t, 2.0, cfg.Multiplier)
}
