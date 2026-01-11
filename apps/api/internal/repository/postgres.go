package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
)

// DB represents the database connection pool.
type DB struct {
	*sql.DB
	cfg *config.DatabaseConfig
}

// NewDB creates a new database connection pool.
func NewDB(cfg *config.DatabaseConfig) (*DB, error) {
	db, err := sql.Open("postgres", cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(time.Duration(cfg.ConnMaxLifetime) * time.Second)

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info().
		Int("max_open_conns", cfg.MaxOpenConns).
		Int("max_idle_conns", cfg.MaxIdleConns).
		Msg("database connection established")

	return &DB{DB: db, cfg: cfg}, nil
}

// Close closes the database connection pool.
func (db *DB) Close() error {
	return db.DB.Close()
}

// Ping checks database connectivity.
func (db *DB) Ping(ctx context.Context) error {
	return db.DB.PingContext(ctx)
}

// Tx represents a database transaction.
type Tx struct {
	*sql.Tx
}

// BeginTx starts a new transaction.
func (db *DB) BeginTx(ctx context.Context) (*Tx, error) {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	return &Tx{Tx: tx}, nil
}

// BeginTxWithOptions starts a new transaction with custom options.
func (db *DB) BeginTxWithOptions(ctx context.Context, opts *sql.TxOptions) (*Tx, error) {
	tx, err := db.DB.BeginTx(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	return &Tx{Tx: tx}, nil
}

// Commit commits the transaction.
func (tx *Tx) Commit() error {
	return tx.Tx.Commit()
}

// Rollback rolls back the transaction.
func (tx *Tx) Rollback() error {
	return tx.Tx.Rollback()
}

// WithTx executes a function within a transaction.
// If the function returns an error, the transaction is rolled back.
// Otherwise, the transaction is committed.
func (db *DB) WithTx(ctx context.Context, fn func(*Tx) error) error {
	tx, err := db.BeginTx(ctx)
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("tx error: %v, rollback error: %w", err, rbErr)
		}
		return err
	}

	return tx.Commit()
}

// QueryRow executes a query that returns a single row.
type Querier interface {
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
}

// Ensure DB and Tx implement Querier.
var _ Querier = (*sql.DB)(nil)
var _ Querier = (*sql.Tx)(nil)

// PreparedStatements holds commonly used prepared statements.
type PreparedStatements struct {
	db         *DB
	statements map[string]*sql.Stmt
}

// NewPreparedStatements creates a new PreparedStatements instance.
func NewPreparedStatements(db *DB) *PreparedStatements {
	return &PreparedStatements{
		db:         db,
		statements: make(map[string]*sql.Stmt),
	}
}

// Prepare prepares a statement and caches it.
func (ps *PreparedStatements) Prepare(name, query string) error {
	stmt, err := ps.db.Prepare(query)
	if err != nil {
		return fmt.Errorf("failed to prepare statement %s: %w", name, err)
	}
	ps.statements[name] = stmt
	return nil
}

// Get returns a prepared statement by name.
func (ps *PreparedStatements) Get(name string) (*sql.Stmt, bool) {
	stmt, ok := ps.statements[name]
	return stmt, ok
}

// Close closes all prepared statements.
func (ps *PreparedStatements) Close() error {
	var lastErr error
	for name, stmt := range ps.statements {
		if err := stmt.Close(); err != nil {
			log.Error().Err(err).Str("statement", name).Msg("failed to close prepared statement")
			lastErr = err
		}
	}
	return lastErr
}

// NullableString returns a sql.NullString from a string pointer.
func NullableString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

// NullableStringValue returns a sql.NullString from a string value.
func NullableStringValue(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

// StringFromNull returns a string from sql.NullString.
func StringFromNull(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

// StringPtrFromNull returns a string pointer from sql.NullString.
func StringPtrFromNull(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

// NullableTime returns a sql.NullTime from a time pointer.
func NullableTime(t *time.Time) sql.NullTime {
	if t == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: *t, Valid: true}
}

// TimeFromNull returns a time.Time from sql.NullTime.
func TimeFromNull(nt sql.NullTime) time.Time {
	if nt.Valid {
		return nt.Time
	}
	return time.Time{}
}

// TimePtrFromNull returns a time pointer from sql.NullTime.
func TimePtrFromNull(nt sql.NullTime) *time.Time {
	if nt.Valid {
		return &nt.Time
	}
	return nil
}
