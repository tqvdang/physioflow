package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// PainLocationRepository defines the interface for pain location data access.
type PainLocationRepository interface {
	UpdatePainLocations(ctx context.Context, sessionID string, data *model.PainLocationData) error
	GetPainLocations(ctx context.Context, sessionID string) (*model.PainLocationData, error)
}

// postgresPainLocationRepo implements PainLocationRepository with PostgreSQL.
type postgresPainLocationRepo struct {
	db *DB
}

// NewPainLocationRepository creates a new PostgreSQL pain location repository.
func NewPainLocationRepository(db *DB) PainLocationRepository {
	return &postgresPainLocationRepo{db: db}
}

// UpdatePainLocations updates the pain_locations JSONB column for a session.
func (r *postgresPainLocationRepo) UpdatePainLocations(ctx context.Context, sessionID string, data *model.PainLocationData) error {
	jsonData, err := data.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize pain locations: %w", err)
	}

	query := `
		UPDATE treatment_sessions
		SET pain_locations = $1,
		    updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, jsonData, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update pain locations: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

// GetPainLocations retrieves the pain_locations JSONB column for a session.
func (r *postgresPainLocationRepo) GetPainLocations(ctx context.Context, sessionID string) (*model.PainLocationData, error) {
	query := `
		SELECT COALESCE(pain_locations, '{"regions": []}')
		FROM treatment_sessions
		WHERE id = $1`

	var raw json.RawMessage
	err := r.db.QueryRowContext(ctx, query, sessionID).Scan(&raw)
	if err != nil {
		return nil, fmt.Errorf("failed to get pain locations: %w", err)
	}

	return model.PainLocationDataFromJSON(raw)
}

// mockPainLocationRepo provides a mock implementation for development.
type mockPainLocationRepo struct {
	store map[string]*model.PainLocationData
}

// NewMockPainLocationRepository creates a mock pain location repository.
func NewMockPainLocationRepository() PainLocationRepository {
	return &mockPainLocationRepo{
		store: make(map[string]*model.PainLocationData),
	}
}

func (r *mockPainLocationRepo) UpdatePainLocations(_ context.Context, sessionID string, data *model.PainLocationData) error {
	r.store[sessionID] = data
	return nil
}

func (r *mockPainLocationRepo) GetPainLocations(_ context.Context, sessionID string) (*model.PainLocationData, error) {
	data, ok := r.store[sessionID]
	if !ok {
		return &model.PainLocationData{Regions: []model.PainRegion{}}, nil
	}
	return data, nil
}
