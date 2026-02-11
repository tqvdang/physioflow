package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// MedicalTermsService defines the interface for medical terms business logic.
type MedicalTermsService interface {
	// SearchTerms performs trigram-based autocomplete search.
	SearchTerms(ctx context.Context, query, category string) ([]*model.TermSearchResult, error)

	// GetTermByID retrieves a medical term by ID.
	GetTermByID(ctx context.Context, id string) (*model.MedicalTerm, error)

	// CreateCustomTerm adds a custom medical term.
	CreateCustomTerm(ctx context.Context, req *model.CreateMedicalTermRequest) (*model.MedicalTerm, error)

	// GetTermsByCategory retrieves all terms for a given category.
	GetTermsByCategory(ctx context.Context, category string) ([]*model.MedicalTerm, error)

	// GetTermByICD10 retrieves a medical term by ICD-10 code.
	GetTermByICD10(ctx context.Context, code string) (*model.MedicalTerm, error)
}

// medicalTermsService implements MedicalTermsService.
type medicalTermsService struct {
	repo repository.MedicalTermsRepository
}

// NewMedicalTermsService creates a new medical terms service.
func NewMedicalTermsService(repo repository.MedicalTermsRepository) MedicalTermsService {
	return &medicalTermsService{repo: repo}
}

// SearchTerms performs trigram-based autocomplete search with validation.
func (s *medicalTermsService) SearchTerms(ctx context.Context, query, category string) ([]*model.TermSearchResult, error) {
	query = strings.TrimSpace(query)

	if len(query) < 2 {
		return nil, errors.New("search query must be at least 2 characters")
	}

	if category != "" {
		if !isValidCategory(category) {
			return nil, errors.New("invalid category")
		}
	}

	results, err := s.repo.Search(ctx, query, category)
	if err != nil {
		log.Error().Err(err).Str("query", query).Str("category", category).Msg("failed to search medical terms")
		return nil, err
	}

	return results, nil
}

// GetTermByID retrieves a medical term by ID.
func (s *medicalTermsService) GetTermByID(ctx context.Context, id string) (*model.MedicalTerm, error) {
	return s.repo.GetByID(ctx, id)
}

// CreateCustomTerm adds a custom medical term with validation.
func (s *medicalTermsService) CreateCustomTerm(ctx context.Context, req *model.CreateMedicalTermRequest) (*model.MedicalTerm, error) {
	commonlyUsed := true
	if req.CommonlyUsed != nil {
		commonlyUsed = *req.CommonlyUsed
	}

	term := &model.MedicalTerm{
		ID:           uuid.New().String(),
		TermEn:       strings.TrimSpace(req.TermEn),
		TermVi:       strings.TrimSpace(req.TermVi),
		DefinitionEn: strings.TrimSpace(req.DefinitionEn),
		DefinitionVi: strings.TrimSpace(req.DefinitionVi),
		Category:     req.Category,
		Subcategory:  strings.TrimSpace(req.Subcategory),
		ICD10Code:    strings.TrimSpace(req.ICD10Code),
		AliasesEn:    req.AliasesEn,
		AliasesVi:    req.AliasesVi,
		CommonlyUsed: commonlyUsed,
		UsageNotes:   strings.TrimSpace(req.UsageNotes),
		IsActive:     true,
	}

	if err := s.repo.Create(ctx, term); err != nil {
		log.Error().Err(err).Str("term_en", term.TermEn).Msg("failed to create medical term")
		return nil, err
	}

	log.Info().
		Str("term_id", term.ID).
		Str("term_en", term.TermEn).
		Str("category", term.Category).
		Msg("medical term created")

	return term, nil
}

// GetTermsByCategory retrieves all terms for a given category.
func (s *medicalTermsService) GetTermsByCategory(ctx context.Context, category string) ([]*model.MedicalTerm, error) {
	if !isValidCategory(category) {
		return nil, errors.New("invalid category")
	}

	return s.repo.GetByCategory(ctx, category)
}

// GetTermByICD10 retrieves a medical term by ICD-10 code.
func (s *medicalTermsService) GetTermByICD10(ctx context.Context, code string) (*model.MedicalTerm, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return nil, errors.New("ICD-10 code is required")
	}

	return s.repo.GetByICD10(ctx, code)
}

// isValidCategory checks if a category string is one of the valid categories.
func isValidCategory(category string) bool {
	for _, vc := range model.ValidTermCategories {
		if category == vc {
			return true
		}
	}
	return false
}
