package circuitbreaker

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestCB(cfg Config) (*CircuitBreaker, *time.Time) {
	now := time.Now()
	cb := New(cfg)
	cb.now = func() time.Time { return now }
	return cb, &now
}

func TestCircuitBreaker_StartsInClosedState(t *testing.T) {
	cb := New(DefaultConfig("test"))
	assert.Equal(t, StateClosed, cb.State())
}

func TestCircuitBreaker_ClosedAllowsRequests(t *testing.T) {
	cb := New(DefaultConfig("test"))

	err := cb.Execute(func() error { return nil })
	assert.NoError(t, err)
}

func TestCircuitBreaker_OpensAfterFailureThreshold(t *testing.T) {
	cfg := Config{
		Name:              "test",
		FailureThreshold:  3,
		Timeout:           30 * time.Second,
		HalfOpenSuccesses: 2,
	}
	cb, _ := newTestCB(cfg)

	opErr := errors.New("operation failed")

	// Fail 3 times to hit threshold.
	for i := 0; i < 3; i++ {
		err := cb.Execute(func() error { return opErr })
		assert.Error(t, err)
	}

	assert.Equal(t, StateOpen, cb.State())
}

func TestCircuitBreaker_OpenRejectsRequests(t *testing.T) {
	cfg := Config{
		Name:              "test",
		FailureThreshold:  2,
		Timeout:           30 * time.Second,
		HalfOpenSuccesses: 2,
	}
	cb, _ := newTestCB(cfg)

	opErr := errors.New("operation failed")

	// Trip the circuit.
	for i := 0; i < 2; i++ {
		_ = cb.Execute(func() error { return opErr })
	}

	// Requests should be rejected.
	err := cb.Execute(func() error { return nil })
	assert.Error(t, err)
	assert.True(t, errors.Is(err, ErrCircuitOpen))
}

func TestCircuitBreaker_TransitionsToHalfOpenAfterTimeout(t *testing.T) {
	cfg := Config{
		Name:              "test",
		FailureThreshold:  2,
		Timeout:           5 * time.Second,
		HalfOpenSuccesses: 2,
	}
	cb, now := newTestCB(cfg)

	opErr := errors.New("operation failed")

	// Trip the circuit.
	for i := 0; i < 2; i++ {
		_ = cb.Execute(func() error { return opErr })
	}
	assert.Equal(t, StateOpen, cb.State())

	// Advance time past the timeout.
	*now = now.Add(6 * time.Second)

	// State should now report as half-open.
	assert.Equal(t, StateHalfOpen, cb.State())

	// Next request should be allowed (transitions internally to half-open).
	err := cb.Execute(func() error { return nil })
	assert.NoError(t, err)
}

func TestCircuitBreaker_HalfOpenClosesAfterSuccesses(t *testing.T) {
	cfg := Config{
		Name:              "test",
		FailureThreshold:  2,
		Timeout:           5 * time.Second,
		HalfOpenSuccesses: 3,
	}
	cb, now := newTestCB(cfg)

	opErr := errors.New("operation failed")

	// Trip the circuit.
	for i := 0; i < 2; i++ {
		_ = cb.Execute(func() error { return opErr })
	}

	// Advance time past timeout.
	*now = now.Add(6 * time.Second)

	// 3 successes in half-open should close the circuit.
	for i := 0; i < 3; i++ {
		err := cb.Execute(func() error { return nil })
		assert.NoError(t, err)
	}

	assert.Equal(t, StateClosed, cb.State())
}

func TestCircuitBreaker_HalfOpenReopensOnFailure(t *testing.T) {
	cfg := Config{
		Name:              "test",
		FailureThreshold:  2,
		Timeout:           5 * time.Second,
		HalfOpenSuccesses: 3,
	}
	cb, now := newTestCB(cfg)

	opErr := errors.New("operation failed")

	// Trip the circuit.
	for i := 0; i < 2; i++ {
		_ = cb.Execute(func() error { return opErr })
	}

	// Advance time past timeout.
	*now = now.Add(6 * time.Second)

	// One success, then a failure in half-open.
	_ = cb.Execute(func() error { return nil })
	_ = cb.Execute(func() error { return opErr })

	assert.Equal(t, StateOpen, cb.State())
}

func TestCircuitBreaker_SuccessResetsFailureCount(t *testing.T) {
	cfg := Config{
		Name:              "test",
		FailureThreshold:  3,
		Timeout:           30 * time.Second,
		HalfOpenSuccesses: 2,
	}
	cb, _ := newTestCB(cfg)

	opErr := errors.New("operation failed")

	// 2 failures (below threshold).
	_ = cb.Execute(func() error { return opErr })
	_ = cb.Execute(func() error { return opErr })

	// A success resets the count.
	_ = cb.Execute(func() error { return nil })

	failures, _ := cb.Counts()
	assert.Equal(t, 0, failures)

	// 2 more failures should not trip since we reset.
	_ = cb.Execute(func() error { return opErr })
	_ = cb.Execute(func() error { return opErr })

	assert.Equal(t, StateClosed, cb.State())
}

func TestCircuitBreaker_Reset(t *testing.T) {
	cfg := Config{
		Name:              "test",
		FailureThreshold:  2,
		Timeout:           30 * time.Second,
		HalfOpenSuccesses: 2,
	}
	cb, _ := newTestCB(cfg)

	opErr := errors.New("operation failed")

	// Trip the circuit.
	for i := 0; i < 2; i++ {
		_ = cb.Execute(func() error { return opErr })
	}
	require.Equal(t, StateOpen, cb.State())

	// Reset.
	cb.Reset()
	assert.Equal(t, StateClosed, cb.State())

	// Should allow requests again.
	err := cb.Execute(func() error { return nil })
	assert.NoError(t, err)
}

func TestCircuitBreaker_StateString(t *testing.T) {
	tests := []struct {
		state    State
		expected string
	}{
		{StateClosed, "closed"},
		{StateOpen, "open"},
		{StateHalfOpen, "half-open"},
		{State(99), "unknown"},
	}

	for _, tt := range tests {
		assert.Equal(t, tt.expected, tt.state.String())
	}
}

func TestCircuitBreaker_ExecutePassesThroughOriginalError(t *testing.T) {
	cb := New(DefaultConfig("test"))

	originalErr := errors.New("database timeout")
	err := cb.Execute(func() error { return originalErr })

	assert.ErrorIs(t, err, originalErr)
}
