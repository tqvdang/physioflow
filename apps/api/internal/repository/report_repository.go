package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// ReportRepository defines the interface for report template and generated report data access.
type ReportRepository interface {
	// Templates
	GetTemplateByTypeAndLocale(ctx context.Context, templateType model.ReportType, locale string) (*model.ReportTemplate, error)
	GetTemplateBySlug(ctx context.Context, slug string) (*model.ReportTemplate, error)

	// Generated reports
	CreateGeneratedReport(ctx context.Context, report *model.GeneratedReport) error
	GetGeneratedReport(ctx context.Context, sourceType, sourceID, locale string) (*model.GeneratedReport, error)
}

// postgresReportRepo implements ReportRepository with PostgreSQL.
type postgresReportRepo struct {
	db *DB
}

// NewReportRepository creates a new PostgreSQL report repository.
func NewReportRepository(db *DB) ReportRepository {
	return &postgresReportRepo{db: db}
}

// GetTemplateByTypeAndLocale retrieves the default active template for a given type and locale.
func (r *postgresReportRepo) GetTemplateByTypeAndLocale(ctx context.Context, templateType model.ReportType, locale string) (*model.ReportTemplate, error) {
	query := `
		SELECT id, name, slug, description, locale, template_type,
			content_html, header_html, footer_html, css,
			page_size, orientation,
			margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
			is_default, is_active, version, created_at, updated_at
		FROM report_templates
		WHERE template_type = $1 AND locale = $2 AND is_active = TRUE AND is_default = TRUE
		LIMIT 1`

	return r.scanTemplate(r.db.QueryRowContext(ctx, query, templateType, locale))
}

// GetTemplateBySlug retrieves a template by its slug.
func (r *postgresReportRepo) GetTemplateBySlug(ctx context.Context, slug string) (*model.ReportTemplate, error) {
	query := `
		SELECT id, name, slug, description, locale, template_type,
			content_html, header_html, footer_html, css,
			page_size, orientation,
			margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
			is_default, is_active, version, created_at, updated_at
		FROM report_templates
		WHERE slug = $1`

	return r.scanTemplate(r.db.QueryRowContext(ctx, query, slug))
}

func (r *postgresReportRepo) scanTemplate(row *sql.Row) (*model.ReportTemplate, error) {
	var t model.ReportTemplate
	var description, contentHTML, headerHTML, footerHTML, css sql.NullString

	err := row.Scan(
		&t.ID, &t.Name, &t.Slug, &description, &t.Locale, &t.TemplateType,
		&contentHTML, &headerHTML, &footerHTML, &css,
		&t.PageSize, &t.Orientation,
		&t.MarginTopMM, &t.MarginBottomMM, &t.MarginLeftMM, &t.MarginRightMM,
		&t.IsDefault, &t.IsActive, &t.Version, &t.CreatedAt, &t.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan report template: %w", err)
	}

	t.Description = StringFromNull(description)
	t.ContentHTML = StringFromNull(contentHTML)
	t.HeaderHTML = StringFromNull(headerHTML)
	t.FooterHTML = StringFromNull(footerHTML)
	t.CSS = StringFromNull(css)

	return &t, nil
}

// CreateGeneratedReport inserts a record of a generated PDF report.
func (r *postgresReportRepo) CreateGeneratedReport(ctx context.Context, report *model.GeneratedReport) error {
	query := `
		INSERT INTO generated_reports (
			id, template_id, report_type, source_id, source_type,
			locale, file_path, file_size_bytes, mime_type, generated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING generated_at`

	err := r.db.QueryRowContext(ctx, query,
		report.ID,
		NullableString(report.TemplateID),
		report.ReportType,
		report.SourceID,
		report.SourceType,
		report.Locale,
		NullableStringValue(report.FilePath),
		report.FileSizeBytes,
		report.MimeType,
		NullableString(report.GeneratedBy),
	).Scan(&report.GeneratedAt)

	if err != nil {
		return fmt.Errorf("failed to create generated report: %w", err)
	}

	return nil
}

// GetGeneratedReport retrieves the most recent generated report for a source.
func (r *postgresReportRepo) GetGeneratedReport(ctx context.Context, sourceType, sourceID, locale string) (*model.GeneratedReport, error) {
	query := `
		SELECT id, template_id, report_type, source_id, source_type,
			locale, file_path, file_size_bytes, mime_type, generated_by, generated_at
		FROM generated_reports
		WHERE source_type = $1 AND source_id = $2 AND locale = $3
		ORDER BY generated_at DESC
		LIMIT 1`

	var gr model.GeneratedReport
	var templateID, filePath, generatedBy sql.NullString

	err := r.db.QueryRowContext(ctx, query, sourceType, sourceID, locale).Scan(
		&gr.ID, &templateID, &gr.ReportType, &gr.SourceID, &gr.SourceType,
		&gr.Locale, &filePath, &gr.FileSizeBytes, &gr.MimeType, &generatedBy, &gr.GeneratedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan generated report: %w", err)
	}

	gr.TemplateID = StringPtrFromNull(templateID)
	gr.FilePath = StringFromNull(filePath)
	gr.GeneratedBy = StringPtrFromNull(generatedBy)

	return &gr, nil
}

// mockReportRepo provides a mock implementation for development.
type mockReportRepo struct{}

// NewMockReportRepository creates a mock report repository.
func NewMockReportRepository() ReportRepository {
	return &mockReportRepo{}
}

func (r *mockReportRepo) GetTemplateByTypeAndLocale(_ context.Context, _ model.ReportType, _ string) (*model.ReportTemplate, error) {
	return &model.ReportTemplate{
		ID:           "mock-template-id",
		Name:         "Mock Template",
		Slug:         "mock-template",
		Locale:       "vi",
		TemplateType: model.ReportTypeDischargeSummary,
		PageSize:     "A4",
		Orientation:  "portrait",
		IsDefault:    true,
		IsActive:     true,
		Version:      1,
	}, nil
}

func (r *mockReportRepo) GetTemplateBySlug(_ context.Context, _ string) (*model.ReportTemplate, error) {
	return nil, ErrNotFound
}

func (r *mockReportRepo) CreateGeneratedReport(_ context.Context, report *model.GeneratedReport) error {
	report.GeneratedAt = time.Now()
	return nil
}

func (r *mockReportRepo) GetGeneratedReport(_ context.Context, _, _, _ string) (*model.GeneratedReport, error) {
	return nil, ErrNotFound
}
