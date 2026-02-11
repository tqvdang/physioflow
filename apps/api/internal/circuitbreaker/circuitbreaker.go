package circuitbreaker

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// State represents the current state of the circuit breaker.
type State int

const (
	// StateClosed allows requests to pass through normally.
	StateClosed State = iota
	// StateOpen rejects requests immediately.
	StateOpen
	// StateHalfOpen allows a limited number of requests to test recovery.
	StateHalfOpen
)

// String returns the human-readable name of a circuit breaker state.
func (s State) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

var (
	// ErrCircuitOpen is returned when the circuit breaker is open and rejecting requests.
	ErrCircuitOpen = errors.New("circuit breaker is open")
)

// Config holds configuration for a circuit breaker.
type Config struct {
	// Name identifies this circuit breaker in logs.
	Name string
	// FailureThreshold is the number of consecutive failures before opening the circuit.
	FailureThreshold int
	// Timeout is how long to wait in Open state before transitioning to Half-Open.
	Timeout time.Duration
	// HalfOpenSuccesses is the number of consecutive successes in Half-Open to close the circuit.
	HalfOpenSuccesses int
}

// DefaultConfig returns a Config with sensible defaults.
func DefaultConfig(name string) Config {
	return Config{
		Name:              name,
		FailureThreshold:  5,
		Timeout:           30 * time.Second,
		HalfOpenSuccesses: 3,
	}
}

// CircuitBreaker implements the circuit breaker pattern to prevent cascading failures.
type CircuitBreaker struct {
	mu sync.RWMutex
	cfg Config

	state             State
	failureCount      int
	successCount      int
	lastFailureTime   time.Time
	lastStateChange   time.Time

	// now is a function that returns the current time, allowing tests to control time.
	now func() time.Time
}

// New creates a new CircuitBreaker with the given configuration.
func New(cfg Config) *CircuitBreaker {
	return &CircuitBreaker{
		cfg:             cfg,
		state:           StateClosed,
		lastStateChange: time.Now(),
		now:             time.Now,
	}
}

// Execute runs the given function through the circuit breaker.
// If the circuit is open, it returns ErrCircuitOpen immediately.
// If the function succeeds, it records the success.
// If the function fails, it records the failure and may trip the circuit.
func (cb *CircuitBreaker) Execute(fn func() error) error {
	if !cb.allowRequest() {
		return fmt.Errorf("%s: %w", cb.cfg.Name, ErrCircuitOpen)
	}

	err := fn()
	if err != nil {
		cb.recordFailure()
		return err
	}

	cb.recordSuccess()
	return nil
}

// State returns the current state of the circuit breaker.
func (cb *CircuitBreaker) State() State {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	// Check if we should transition from Open to Half-Open.
	if cb.state == StateOpen && cb.now().Sub(cb.lastFailureTime) >= cb.cfg.Timeout {
		return StateHalfOpen
	}

	return cb.state
}

// allowRequest determines whether a request should be allowed through.
func (cb *CircuitBreaker) allowRequest() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		return true

	case StateOpen:
		// Check if timeout has elapsed to transition to half-open.
		if cb.now().Sub(cb.lastFailureTime) >= cb.cfg.Timeout {
			cb.transitionTo(StateHalfOpen)
			return true
		}
		return false

	case StateHalfOpen:
		return true

	default:
		return false
	}
}

// recordSuccess records a successful operation.
func (cb *CircuitBreaker) recordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		cb.failureCount = 0

	case StateHalfOpen:
		cb.successCount++
		if cb.successCount >= cb.cfg.HalfOpenSuccesses {
			cb.transitionTo(StateClosed)
		}
	}
}

// recordFailure records a failed operation.
func (cb *CircuitBreaker) recordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.lastFailureTime = cb.now()

	switch cb.state {
	case StateClosed:
		cb.failureCount++
		if cb.failureCount >= cb.cfg.FailureThreshold {
			cb.transitionTo(StateOpen)
		}

	case StateHalfOpen:
		// Any failure in half-open state re-opens the circuit.
		cb.transitionTo(StateOpen)
	}
}

// transitionTo changes the circuit breaker to the given state.
// Caller must hold cb.mu.
func (cb *CircuitBreaker) transitionTo(state State) {
	if cb.state == state {
		return
	}

	prevState := cb.state
	cb.state = state
	cb.lastStateChange = cb.now()

	// Reset counters on state transition.
	switch state {
	case StateClosed:
		cb.failureCount = 0
		cb.successCount = 0
	case StateOpen:
		cb.successCount = 0
	case StateHalfOpen:
		cb.successCount = 0
		cb.failureCount = 0
	}

	log.Warn().
		Str("circuit_breaker", cb.cfg.Name).
		Str("from_state", prevState.String()).
		Str("to_state", state.String()).
		Int("failure_count", cb.failureCount).
		Msg("circuit breaker state changed")
}

// Reset forces the circuit breaker back to the Closed state.
func (cb *CircuitBreaker) Reset() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.transitionTo(StateClosed)
}

// Counts returns the current failure and success counts.
func (cb *CircuitBreaker) Counts() (failures, successes int) {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.failureCount, cb.successCount
}
