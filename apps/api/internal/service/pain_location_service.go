package service

import (
	"context"
	"fmt"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// PainLocationService defines the interface for pain location business logic.
type PainLocationService interface {
	UpdatePainLocations(ctx context.Context, clinicID string, req *model.UpdatePainLocationsRequest) (*model.PainLocationsResponse, error)
	GetPainLocations(ctx context.Context, sessionID string) (*model.PainLocationsResponse, error)
}

// painLocationService implements PainLocationService.
type painLocationService struct {
	repo repository.PainLocationRepository
}

// NewPainLocationService creates a new pain location service.
func NewPainLocationService(repo repository.PainLocationRepository) PainLocationService {
	return &painLocationService{repo: repo}
}

// UpdatePainLocations validates and persists pain location data for a session.
func (s *painLocationService) UpdatePainLocations(ctx context.Context, clinicID string, req *model.UpdatePainLocationsRequest) (*model.PainLocationsResponse, error) {
	// Validate all region IDs
	for _, region := range req.Regions {
		if !model.ValidateRegionID(region.ID) {
			return nil, fmt.Errorf("invalid anatomy region: %s", region.ID)
		}
		if region.Severity < 0 || region.Severity > 10 {
			return nil, fmt.Errorf("severity must be between 0 and 10, got %d", region.Severity)
		}
	}

	// Deduplicate: keep last entry per region ID
	seen := make(map[string]int)
	deduplicated := make([]model.PainRegion, 0, len(req.Regions))
	for _, region := range req.Regions {
		if idx, exists := seen[region.ID]; exists {
			deduplicated[idx] = region
		} else {
			seen[region.ID] = len(deduplicated)
			deduplicated = append(deduplicated, region)
		}
	}

	data := &model.PainLocationData{
		Regions: deduplicated,
	}

	if err := s.repo.UpdatePainLocations(ctx, req.SessionID, data); err != nil {
		return nil, fmt.Errorf("failed to update pain locations: %w", err)
	}

	return &model.PainLocationsResponse{
		SessionID: req.SessionID,
		Regions:   deduplicated,
	}, nil
}

// GetPainLocations retrieves pain location data for a session.
func (s *painLocationService) GetPainLocations(ctx context.Context, sessionID string) (*model.PainLocationsResponse, error) {
	data, err := s.repo.GetPainLocations(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pain locations: %w", err)
	}

	return &model.PainLocationsResponse{
		SessionID: sessionID,
		Regions:   data.Regions,
	}, nil
}
