package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// MedicalTermsRepository defines the interface for medical terms data access.
type MedicalTermsRepository interface {
	// Search performs trigram-based autocomplete search on term_en and term_vi.
	Search(ctx context.Context, query, category string) ([]*model.TermSearchResult, error)

	// GetByID retrieves a medical term by ID.
	GetByID(ctx context.Context, id string) (*model.MedicalTerm, error)

	// Create adds a custom medical term.
	Create(ctx context.Context, term *model.MedicalTerm) error

	// GetByCategory retrieves all medical terms for a given category.
	GetByCategory(ctx context.Context, category string) ([]*model.MedicalTerm, error)

	// GetByICD10 retrieves a medical term by ICD-10 code.
	GetByICD10(ctx context.Context, code string) (*model.MedicalTerm, error)
}

// postgresMedicalTermsRepo implements MedicalTermsRepository with PostgreSQL.
type postgresMedicalTermsRepo struct {
	db *DB
}

// NewMedicalTermsRepository creates a new PostgreSQL medical terms repository.
func NewMedicalTermsRepository(db *DB) MedicalTermsRepository {
	return &postgresMedicalTermsRepo{db: db}
}

// Search performs trigram-based autocomplete search on term_en and term_vi.
func (r *postgresMedicalTermsRepo) Search(ctx context.Context, query, category string) ([]*model.TermSearchResult, error) {
	baseQuery := `
		SELECT
			id, term_en, term_vi, definition_en, definition_vi,
			category, subcategory, icd10_code,
			aliases_en, aliases_vi, commonly_used, usage_notes,
			is_active, created_at, updated_at,
			GREATEST(similarity(term_en, $1), similarity(term_vi, $1)) AS sim_score,
			CASE
				WHEN similarity(term_en, $1) >= similarity(term_vi, $1) THEN 'term_en'
				ELSE 'term_vi'
			END AS match_field
		FROM vietnamese_medical_terms
		WHERE is_active = true
			AND (term_en % $1 OR term_vi % $1 OR term_en ILIKE '%' || $1 || '%' OR term_vi ILIKE '%' || $1 || '%')
	`

	args := []interface{}{query}

	if category != "" {
		baseQuery += " AND category = $2"
		args = append(args, category)
	}

	baseQuery += " ORDER BY sim_score DESC LIMIT 20"

	rows, err := r.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search medical terms: %w", err)
	}
	defer rows.Close()

	var results []*model.TermSearchResult
	for rows.Next() {
		result, err := r.scanSearchResult(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating medical terms: %w", err)
	}

	return results, nil
}

// GetByID retrieves a medical term by ID.
func (r *postgresMedicalTermsRepo) GetByID(ctx context.Context, id string) (*model.MedicalTerm, error) {
	query := `
		SELECT
			id, term_en, term_vi, definition_en, definition_vi,
			category, subcategory, icd10_code,
			aliases_en, aliases_vi, commonly_used, usage_notes,
			is_active, created_at, updated_at
		FROM vietnamese_medical_terms
		WHERE id = $1`

	return r.scanTerm(r.db.QueryRowContext(ctx, query, id))
}

// Create inserts a new medical term.
func (r *postgresMedicalTermsRepo) Create(ctx context.Context, term *model.MedicalTerm) error {
	if term.ID == "" {
		term.ID = uuid.New().String()
	}

	query := `
		INSERT INTO vietnamese_medical_terms (
			id, term_en, term_vi, definition_en, definition_vi,
			category, subcategory, icd10_code,
			aliases_en, aliases_vi, commonly_used, usage_notes,
			is_active
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		term.ID,
		term.TermEn,
		term.TermVi,
		NullableStringValue(term.DefinitionEn),
		NullableStringValue(term.DefinitionVi),
		term.Category,
		NullableStringValue(term.Subcategory),
		NullableStringValue(term.ICD10Code),
		pq.Array(term.AliasesEn),
		pq.Array(term.AliasesVi),
		term.CommonlyUsed,
		NullableStringValue(term.UsageNotes),
		term.IsActive,
	).Scan(&term.CreatedAt, &term.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create medical term: %w", err)
	}

	return nil
}

// GetByCategory retrieves all active medical terms for a given category.
func (r *postgresMedicalTermsRepo) GetByCategory(ctx context.Context, category string) ([]*model.MedicalTerm, error) {
	query := `
		SELECT
			id, term_en, term_vi, definition_en, definition_vi,
			category, subcategory, icd10_code,
			aliases_en, aliases_vi, commonly_used, usage_notes,
			is_active, created_at, updated_at
		FROM vietnamese_medical_terms
		WHERE category = $1 AND is_active = true
		ORDER BY term_en ASC`

	rows, err := r.db.QueryContext(ctx, query, category)
	if err != nil {
		return nil, fmt.Errorf("failed to get medical terms by category: %w", err)
	}
	defer rows.Close()

	var terms []*model.MedicalTerm
	for rows.Next() {
		term, err := r.scanTermRows(rows)
		if err != nil {
			return nil, err
		}
		terms = append(terms, term)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating medical terms: %w", err)
	}

	return terms, nil
}

// GetByICD10 retrieves a medical term by ICD-10 code.
func (r *postgresMedicalTermsRepo) GetByICD10(ctx context.Context, code string) (*model.MedicalTerm, error) {
	query := `
		SELECT
			id, term_en, term_vi, definition_en, definition_vi,
			category, subcategory, icd10_code,
			aliases_en, aliases_vi, commonly_used, usage_notes,
			is_active, created_at, updated_at
		FROM vietnamese_medical_terms
		WHERE icd10_code = $1 AND is_active = true`

	return r.scanTerm(r.db.QueryRowContext(ctx, query, code))
}

// scanTerm scans a single medical term from a sql.Row.
func (r *postgresMedicalTermsRepo) scanTerm(row *sql.Row) (*model.MedicalTerm, error) {
	var t model.MedicalTerm
	var definitionEn, definitionVi, subcategory, icd10Code, usageNotes sql.NullString
	var aliasesEn, aliasesVi []string

	err := row.Scan(
		&t.ID,
		&t.TermEn,
		&t.TermVi,
		&definitionEn,
		&definitionVi,
		&t.Category,
		&subcategory,
		&icd10Code,
		pq.Array(&aliasesEn),
		pq.Array(&aliasesVi),
		&t.CommonlyUsed,
		&usageNotes,
		&t.IsActive,
		&t.CreatedAt,
		&t.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan medical term: %w", err)
	}

	t.DefinitionEn = StringFromNull(definitionEn)
	t.DefinitionVi = StringFromNull(definitionVi)
	t.Subcategory = StringFromNull(subcategory)
	t.ICD10Code = StringFromNull(icd10Code)
	t.UsageNotes = StringFromNull(usageNotes)
	t.AliasesEn = aliasesEn
	t.AliasesVi = aliasesVi

	return &t, nil
}

// scanTermRows scans a single medical term from sql.Rows.
func (r *postgresMedicalTermsRepo) scanTermRows(rows *sql.Rows) (*model.MedicalTerm, error) {
	var t model.MedicalTerm
	var definitionEn, definitionVi, subcategory, icd10Code, usageNotes sql.NullString
	var aliasesEn, aliasesVi []string

	err := rows.Scan(
		&t.ID,
		&t.TermEn,
		&t.TermVi,
		&definitionEn,
		&definitionVi,
		&t.Category,
		&subcategory,
		&icd10Code,
		pq.Array(&aliasesEn),
		pq.Array(&aliasesVi),
		&t.CommonlyUsed,
		&usageNotes,
		&t.IsActive,
		&t.CreatedAt,
		&t.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scan medical term row: %w", err)
	}

	t.DefinitionEn = StringFromNull(definitionEn)
	t.DefinitionVi = StringFromNull(definitionVi)
	t.Subcategory = StringFromNull(subcategory)
	t.ICD10Code = StringFromNull(icd10Code)
	t.UsageNotes = StringFromNull(usageNotes)
	t.AliasesEn = aliasesEn
	t.AliasesVi = aliasesVi

	return &t, nil
}

// scanSearchResult scans a search result row including similarity score and match field.
func (r *postgresMedicalTermsRepo) scanSearchResult(rows *sql.Rows) (*model.TermSearchResult, error) {
	var t model.MedicalTerm
	var definitionEn, definitionVi, subcategory, icd10Code, usageNotes sql.NullString
	var aliasesEn, aliasesVi []string
	var simScore float64
	var matchField string

	err := rows.Scan(
		&t.ID,
		&t.TermEn,
		&t.TermVi,
		&definitionEn,
		&definitionVi,
		&t.Category,
		&subcategory,
		&icd10Code,
		pq.Array(&aliasesEn),
		pq.Array(&aliasesVi),
		&t.CommonlyUsed,
		&usageNotes,
		&t.IsActive,
		&t.CreatedAt,
		&t.UpdatedAt,
		&simScore,
		&matchField,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scan search result: %w", err)
	}

	t.DefinitionEn = StringFromNull(definitionEn)
	t.DefinitionVi = StringFromNull(definitionVi)
	t.Subcategory = StringFromNull(subcategory)
	t.ICD10Code = StringFromNull(icd10Code)
	t.UsageNotes = StringFromNull(usageNotes)
	t.AliasesEn = aliasesEn
	t.AliasesVi = aliasesVi

	return &model.TermSearchResult{
		Term:       t,
		Score:      simScore,
		MatchField: matchField,
	}, nil
}

// mockMedicalTermsRepo provides a mock implementation for development.
type mockMedicalTermsRepo struct{}

// NewMockMedicalTermsRepository creates a mock medical terms repository.
func NewMockMedicalTermsRepository() MedicalTermsRepository {
	return &mockMedicalTermsRepo{}
}

func (r *mockMedicalTermsRepo) Search(ctx context.Context, query, category string) ([]*model.TermSearchResult, error) {
	return []*model.TermSearchResult{}, nil
}

func (r *mockMedicalTermsRepo) GetByID(ctx context.Context, id string) (*model.MedicalTerm, error) {
	return nil, ErrNotFound
}

func (r *mockMedicalTermsRepo) Create(ctx context.Context, term *model.MedicalTerm) error {
	term.ID = uuid.New().String()
	term.CreatedAt = time.Now()
	term.UpdatedAt = time.Now()
	return nil
}

func (r *mockMedicalTermsRepo) GetByCategory(ctx context.Context, category string) ([]*model.MedicalTerm, error) {
	return []*model.MedicalTerm{}, nil
}

func (r *mockMedicalTermsRepo) GetByICD10(ctx context.Context, code string) (*model.MedicalTerm, error) {
	return nil, ErrNotFound
}
