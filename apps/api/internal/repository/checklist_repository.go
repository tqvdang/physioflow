package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// ChecklistTemplateRepository defines the interface for checklist template data access.
type ChecklistTemplateRepository interface {
	// Template operations
	GetByID(ctx context.Context, id string) (*model.ChecklistTemplate, error)
	GetByCode(ctx context.Context, clinicID, code string) (*model.ChecklistTemplate, error)
	List(ctx context.Context, filter model.ChecklistTemplateFilter) ([]model.ChecklistTemplate, int64, error)
	Create(ctx context.Context, template *model.ChecklistTemplate) error
	Update(ctx context.Context, template *model.ChecklistTemplate) error

	// Section operations
	GetSectionsByTemplateID(ctx context.Context, templateID string) ([]model.ChecklistSection, error)
	CreateSection(ctx context.Context, section *model.ChecklistSection) error

	// Item operations
	GetItemsBySectionID(ctx context.Context, sectionID string) ([]model.ChecklistItem, error)
	GetItemsByTemplateID(ctx context.Context, templateID string) ([]model.ChecklistItem, error)
	CreateItem(ctx context.Context, item *model.ChecklistItem) error

	// Full template with nested data
	GetTemplateWithSectionsAndItems(ctx context.Context, id string) (*model.ChecklistTemplate, error)
}

// VisitChecklistRepository defines the interface for visit checklist data access.
type VisitChecklistRepository interface {
	// Checklist operations
	GetByID(ctx context.Context, id string) (*model.VisitChecklist, error)
	GetByIDWithResponses(ctx context.Context, id string) (*model.VisitChecklist, error)
	List(ctx context.Context, filter model.VisitChecklistFilter) ([]model.VisitChecklist, int64, error)
	Create(ctx context.Context, checklist *model.VisitChecklist) error
	Update(ctx context.Context, checklist *model.VisitChecklist) error
	UpdateStatus(ctx context.Context, id string, status model.ChecklistStatus, updatedBy string) error
	UpdateProgress(ctx context.Context, id string, progress float64) error

	// Response operations
	GetResponsesByChecklistID(ctx context.Context, checklistID string) ([]model.ChecklistResponse, error)
	GetResponseByItemID(ctx context.Context, checklistID, itemID string) (*model.ChecklistResponse, error)
	UpsertResponse(ctx context.Context, response *model.ChecklistResponse) error
	UpsertResponses(ctx context.Context, responses []model.ChecklistResponse) error
	DeleteResponse(ctx context.Context, checklistID, itemID string) error

	// Auto-save operations
	SaveAutoSaveData(ctx context.Context, id string, data json.RawMessage) error
	GetAutoSaveData(ctx context.Context, id string) (json.RawMessage, error)

	// Note generation
	SaveGeneratedNote(ctx context.Context, id, note, noteVi string) error

	// Patient's last checklist for auto-population
	GetLastCompletedChecklist(ctx context.Context, patientID, templateType string) (*model.VisitChecklist, error)

	// Calculate progress
	CalculateProgress(ctx context.Context, checklistID string) (float64, error)
}

// =============================================================================
// POSTGRESQL IMPLEMENTATIONS
// =============================================================================

// checklistTemplateRepo implements ChecklistTemplateRepository.
type checklistTemplateRepo struct {
	cfg *config.Config
	db  *DB
}

// newChecklistTemplateRepo creates a new checklist template repository.
func newChecklistTemplateRepo(cfg *config.Config, db *DB) *checklistTemplateRepo {
	return &checklistTemplateRepo{cfg: cfg, db: db}
}

// GetByID retrieves a template by ID.
func (r *checklistTemplateRepo) GetByID(ctx context.Context, id string) (*model.ChecklistTemplate, error) {
	query := `
		SELECT id, clinic_id, name, name_vi, description, description_vi, code,
			   template_type, body_region, applicable_diagnoses, version,
			   is_current_version, previous_version_id, settings, is_active,
			   is_archived, created_at, updated_at, created_by, updated_by
		FROM checklist_templates
		WHERE id = $1 AND is_active = TRUE
	`

	var t model.ChecklistTemplate
	var applicableDiagnoses sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&t.ID, &t.ClinicID, &t.Name, &t.NameVi, &t.Description, &t.DescriptionVi,
		&t.Code, &t.TemplateType, &t.BodyRegion, &applicableDiagnoses, &t.Version,
		&t.IsCurrentVersion, &t.PreviousVersionID, &t.SettingsJSON, &t.IsActive,
		&t.IsArchived, &t.CreatedAt, &t.UpdatedAt, &t.CreatedBy, &t.UpdatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	// Parse applicable diagnoses
	if applicableDiagnoses.Valid {
		t.ApplicableDiagnoses = parsePostgresArray(applicableDiagnoses.String)
	}

	// Parse settings JSON
	if len(t.SettingsJSON) > 0 {
		var settings model.TemplateSettings
		if err := json.Unmarshal(t.SettingsJSON, &settings); err == nil {
			t.Settings = &settings
		}
	}

	return &t, nil
}

// GetByCode retrieves a template by clinic ID and code.
func (r *checklistTemplateRepo) GetByCode(ctx context.Context, clinicID, code string) (*model.ChecklistTemplate, error) {
	query := `
		SELECT id, clinic_id, name, name_vi, description, description_vi, code,
			   template_type, body_region, applicable_diagnoses, version,
			   is_current_version, previous_version_id, settings, is_active,
			   is_archived, created_at, updated_at, created_by, updated_by
		FROM checklist_templates
		WHERE (clinic_id = $1 OR clinic_id IS NULL) AND code = $2 AND is_active = TRUE AND is_current_version = TRUE
		ORDER BY clinic_id DESC NULLS LAST
		LIMIT 1
	`

	var t model.ChecklistTemplate
	var applicableDiagnoses sql.NullString

	err := r.db.QueryRowContext(ctx, query, clinicID, code).Scan(
		&t.ID, &t.ClinicID, &t.Name, &t.NameVi, &t.Description, &t.DescriptionVi,
		&t.Code, &t.TemplateType, &t.BodyRegion, &applicableDiagnoses, &t.Version,
		&t.IsCurrentVersion, &t.PreviousVersionID, &t.SettingsJSON, &t.IsActive,
		&t.IsArchived, &t.CreatedAt, &t.UpdatedAt, &t.CreatedBy, &t.UpdatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get template by code: %w", err)
	}

	if applicableDiagnoses.Valid {
		t.ApplicableDiagnoses = parsePostgresArray(applicableDiagnoses.String)
	}

	if len(t.SettingsJSON) > 0 {
		var settings model.TemplateSettings
		if err := json.Unmarshal(t.SettingsJSON, &settings); err == nil {
			t.Settings = &settings
		}
	}

	return &t, nil
}

// List retrieves templates with filtering and pagination.
func (r *checklistTemplateRepo) List(ctx context.Context, filter model.ChecklistTemplateFilter) ([]model.ChecklistTemplate, int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	conditions = append(conditions, "is_current_version = TRUE")

	if filter.ClinicID != "" {
		conditions = append(conditions, fmt.Sprintf("(clinic_id = $%d OR clinic_id IS NULL)", argIndex))
		args = append(args, filter.ClinicID)
		argIndex++
	}

	if filter.TemplateType != "" {
		conditions = append(conditions, fmt.Sprintf("template_type = $%d", argIndex))
		args = append(args, filter.TemplateType)
		argIndex++
	}

	if filter.BodyRegion != "" {
		conditions = append(conditions, fmt.Sprintf("body_region = $%d", argIndex))
		args = append(args, filter.BodyRegion)
		argIndex++
	}

	if filter.IsActive != nil {
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *filter.IsActive)
		argIndex++
	}

	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR name_vi ILIKE $%d OR code ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM checklist_templates %s", whereClause)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count templates: %w", err)
	}

	// Data query
	query := fmt.Sprintf(`
		SELECT id, clinic_id, name, name_vi, description, description_vi, code,
			   template_type, body_region, version, is_current_version, is_active,
			   is_archived, created_at, updated_at
		FROM checklist_templates
		%s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, filter.Limit(), filter.Offset())

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list templates: %w", err)
	}
	defer rows.Close()

	var templates []model.ChecklistTemplate
	for rows.Next() {
		var t model.ChecklistTemplate
		if err := rows.Scan(
			&t.ID, &t.ClinicID, &t.Name, &t.NameVi, &t.Description, &t.DescriptionVi,
			&t.Code, &t.TemplateType, &t.BodyRegion, &t.Version, &t.IsCurrentVersion,
			&t.IsActive, &t.IsArchived, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan template: %w", err)
		}
		templates = append(templates, t)
	}

	return templates, total, nil
}

// Create creates a new template.
func (r *checklistTemplateRepo) Create(ctx context.Context, template *model.ChecklistTemplate) error {
	query := `
		INSERT INTO checklist_templates (
			clinic_id, name, name_vi, description, description_vi, code,
			template_type, body_region, applicable_diagnoses, version,
			is_current_version, settings, is_active, created_by, updated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, created_at, updated_at
	`

	settingsJSON, _ := json.Marshal(template.Settings)

	err := r.db.QueryRowContext(ctx, query,
		template.ClinicID, template.Name, template.NameVi, template.Description,
		template.DescriptionVi, template.Code, template.TemplateType, template.BodyRegion,
		formatPostgresArray(template.ApplicableDiagnoses), template.Version,
		template.IsCurrentVersion, settingsJSON, template.IsActive,
		template.CreatedBy, template.UpdatedBy,
	).Scan(&template.ID, &template.CreatedAt, &template.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create template: %w", err)
	}

	return nil
}

// Update updates an existing template.
func (r *checklistTemplateRepo) Update(ctx context.Context, template *model.ChecklistTemplate) error {
	query := `
		UPDATE checklist_templates SET
			name = $2, name_vi = $3, description = $4, description_vi = $5,
			code = $6, template_type = $7, body_region = $8, settings = $9,
			is_active = $10, is_archived = $11, updated_by = $12, updated_at = NOW()
		WHERE id = $1
	`

	settingsJSON, _ := json.Marshal(template.Settings)

	result, err := r.db.ExecContext(ctx, query,
		template.ID, template.Name, template.NameVi, template.Description,
		template.DescriptionVi, template.Code, template.TemplateType, template.BodyRegion,
		settingsJSON, template.IsActive, template.IsArchived, template.UpdatedBy,
	)

	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

// GetSectionsByTemplateID retrieves all sections for a template.
func (r *checklistTemplateRepo) GetSectionsByTemplateID(ctx context.Context, templateID string) ([]model.ChecklistSection, error) {
	query := `
		SELECT id, template_id, title, title_vi, description, description_vi,
			   sort_order, is_required, is_collapsible, default_collapsed,
			   display_conditions, settings, created_at, updated_at
		FROM checklist_sections
		WHERE template_id = $1
		ORDER BY sort_order ASC
	`

	rows, err := r.db.QueryContext(ctx, query, templateID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sections: %w", err)
	}
	defer rows.Close()

	var sections []model.ChecklistSection
	for rows.Next() {
		var s model.ChecklistSection
		if err := rows.Scan(
			&s.ID, &s.TemplateID, &s.Title, &s.TitleVi, &s.Description, &s.DescriptionVi,
			&s.SortOrder, &s.IsRequired, &s.IsCollapsible, &s.DefaultCollapsed,
			&s.DisplayCondJSON, &s.Settings, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan section: %w", err)
		}

		// Parse display conditions
		if len(s.DisplayCondJSON) > 0 {
			var conditions model.DisplayConditions
			if err := json.Unmarshal(s.DisplayCondJSON, &conditions); err == nil {
				s.DisplayConditions = &conditions
			}
		}

		sections = append(sections, s)
	}

	return sections, nil
}

// CreateSection creates a new section.
func (r *checklistTemplateRepo) CreateSection(ctx context.Context, section *model.ChecklistSection) error {
	query := `
		INSERT INTO checklist_sections (
			template_id, title, title_vi, description, description_vi,
			sort_order, is_required, is_collapsible, default_collapsed,
			display_conditions, settings
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at
	`

	displayCondJSON, _ := json.Marshal(section.DisplayConditions)

	err := r.db.QueryRowContext(ctx, query,
		section.TemplateID, section.Title, section.TitleVi, section.Description,
		section.DescriptionVi, section.SortOrder, section.IsRequired,
		section.IsCollapsible, section.DefaultCollapsed, displayCondJSON, section.Settings,
	).Scan(&section.ID, &section.CreatedAt, &section.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create section: %w", err)
	}

	return nil
}

// GetItemsBySectionID retrieves all items for a section.
func (r *checklistTemplateRepo) GetItemsBySectionID(ctx context.Context, sectionID string) ([]model.ChecklistItem, error) {
	query := `
		SELECT id, section_id, label, label_vi, help_text, help_text_vi,
			   item_type, item_config, sort_order, is_required,
			   validation_rules, display_conditions, quick_phrases,
			   data_mapping, cds_rules, created_at, updated_at
		FROM checklist_items
		WHERE section_id = $1
		ORDER BY sort_order ASC
	`

	rows, err := r.db.QueryContext(ctx, query, sectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get items: %w", err)
	}
	defer rows.Close()

	return scanChecklistItems(rows)
}

// GetItemsByTemplateID retrieves all items for a template.
func (r *checklistTemplateRepo) GetItemsByTemplateID(ctx context.Context, templateID string) ([]model.ChecklistItem, error) {
	query := `
		SELECT ci.id, ci.section_id, ci.label, ci.label_vi, ci.help_text, ci.help_text_vi,
			   ci.item_type, ci.item_config, ci.sort_order, ci.is_required,
			   ci.validation_rules, ci.display_conditions, ci.quick_phrases,
			   ci.data_mapping, ci.cds_rules, ci.created_at, ci.updated_at
		FROM checklist_items ci
		JOIN checklist_sections cs ON cs.id = ci.section_id
		WHERE cs.template_id = $1
		ORDER BY cs.sort_order ASC, ci.sort_order ASC
	`

	rows, err := r.db.QueryContext(ctx, query, templateID)
	if err != nil {
		return nil, fmt.Errorf("failed to get items: %w", err)
	}
	defer rows.Close()

	return scanChecklistItems(rows)
}

// CreateItem creates a new checklist item.
func (r *checklistTemplateRepo) CreateItem(ctx context.Context, item *model.ChecklistItem) error {
	query := `
		INSERT INTO checklist_items (
			section_id, label, label_vi, help_text, help_text_vi,
			item_type, item_config, sort_order, is_required,
			validation_rules, display_conditions, quick_phrases,
			data_mapping, cds_rules
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at, updated_at
	`

	validationJSON, _ := json.Marshal(item.ValidationRules)
	displayCondJSON, _ := json.Marshal(item.DisplayConditions)
	quickPhrasesJSON, _ := json.Marshal(item.QuickPhrases)
	dataMappingJSON, _ := json.Marshal(item.DataMapping)
	cdsRulesJSON, _ := json.Marshal(item.CDSRules)

	err := r.db.QueryRowContext(ctx, query,
		item.SectionID, item.Label, item.LabelVi, item.HelpText, item.HelpTextVi,
		item.ItemType, item.ItemConfig, item.SortOrder, item.IsRequired,
		validationJSON, displayCondJSON, quickPhrasesJSON, dataMappingJSON, cdsRulesJSON,
	).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create item: %w", err)
	}

	return nil
}

// GetTemplateWithSectionsAndItems retrieves a template with all nested data.
func (r *checklistTemplateRepo) GetTemplateWithSectionsAndItems(ctx context.Context, id string) (*model.ChecklistTemplate, error) {
	template, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	sections, err := r.GetSectionsByTemplateID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Fetch items for each section
	for i := range sections {
		items, err := r.GetItemsBySectionID(ctx, sections[i].ID)
		if err != nil {
			return nil, err
		}
		sections[i].Items = items
	}

	template.Sections = sections
	return template, nil
}

// scanChecklistItems scans rows into ChecklistItem slice.
func scanChecklistItems(rows *sql.Rows) ([]model.ChecklistItem, error) {
	var items []model.ChecklistItem
	for rows.Next() {
		var item model.ChecklistItem
		if err := rows.Scan(
			&item.ID, &item.SectionID, &item.Label, &item.LabelVi, &item.HelpText, &item.HelpTextVi,
			&item.ItemType, &item.ItemConfig, &item.SortOrder, &item.IsRequired,
			&item.ValidationJSON, &item.DisplayCondJSON, &item.QuickPhrasesJSON,
			&item.DataMappingJSON, &item.CDSRulesJSON, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan item: %w", err)
		}

		// Parse JSON fields
		if len(item.ValidationJSON) > 0 {
			var rules model.ValidationRules
			if err := json.Unmarshal(item.ValidationJSON, &rules); err == nil {
				item.ValidationRules = &rules
			}
		}
		if len(item.DisplayCondJSON) > 0 {
			var conds model.DisplayConditions
			if err := json.Unmarshal(item.DisplayCondJSON, &conds); err == nil {
				item.DisplayConditions = &conds
			}
		}
		if len(item.QuickPhrasesJSON) > 0 {
			json.Unmarshal(item.QuickPhrasesJSON, &item.QuickPhrases)
		}
		if len(item.DataMappingJSON) > 0 {
			var mapping model.DataMapping
			if err := json.Unmarshal(item.DataMappingJSON, &mapping); err == nil {
				item.DataMapping = &mapping
			}
		}
		if len(item.CDSRulesJSON) > 0 {
			json.Unmarshal(item.CDSRulesJSON, &item.CDSRules)
		}

		items = append(items, item)
	}
	return items, nil
}

// =============================================================================
// VISIT CHECKLIST REPOSITORY
// =============================================================================

// visitChecklistRepo implements VisitChecklistRepository.
type visitChecklistRepo struct {
	cfg *config.Config
	db  *DB
}

// newVisitChecklistRepo creates a new visit checklist repository.
func newVisitChecklistRepo(cfg *config.Config, db *DB) *visitChecklistRepo {
	return &visitChecklistRepo{cfg: cfg, db: db}
}

// GetByID retrieves a visit checklist by ID.
func (r *visitChecklistRepo) GetByID(ctx context.Context, id string) (*model.VisitChecklist, error) {
	query := `
		SELECT id, template_id, template_version, patient_id, treatment_session_id,
			   assessment_id, therapist_id, clinic_id, status, progress_percentage,
			   started_at, completed_at, locked_at, locked_by, last_auto_save_at,
			   auto_save_data, generated_note, generated_note_vi, note_generation_status,
			   reviewed_by, reviewed_at, review_notes, created_at, updated_at,
			   created_by, updated_by
		FROM visit_checklists
		WHERE id = $1
	`

	var vc model.VisitChecklist
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&vc.ID, &vc.TemplateID, &vc.TemplateVersion, &vc.PatientID,
		&vc.TreatmentSessionID, &vc.AssessmentID, &vc.TherapistID, &vc.ClinicID,
		&vc.Status, &vc.ProgressPercentage, &vc.StartedAt, &vc.CompletedAt,
		&vc.LockedAt, &vc.LockedBy, &vc.LastAutoSaveAt, &vc.AutoSaveData,
		&vc.GeneratedNote, &vc.GeneratedNoteVi, &vc.NoteGenerationStatus,
		&vc.ReviewedBy, &vc.ReviewedAt, &vc.ReviewNotes,
		&vc.CreatedAt, &vc.UpdatedAt, &vc.CreatedBy, &vc.UpdatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get visit checklist: %w", err)
	}

	return &vc, nil
}

// GetByIDWithResponses retrieves a visit checklist with all responses.
func (r *visitChecklistRepo) GetByIDWithResponses(ctx context.Context, id string) (*model.VisitChecklist, error) {
	vc, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	responses, err := r.GetResponsesByChecklistID(ctx, id)
	if err != nil {
		return nil, err
	}

	vc.Responses = responses
	return vc, nil
}

// List retrieves visit checklists with filtering and pagination.
func (r *visitChecklistRepo) List(ctx context.Context, filter model.VisitChecklistFilter) ([]model.VisitChecklist, int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	if filter.ClinicID != "" {
		conditions = append(conditions, fmt.Sprintf("clinic_id = $%d", argIndex))
		args = append(args, filter.ClinicID)
		argIndex++
	}

	if filter.PatientID != "" {
		conditions = append(conditions, fmt.Sprintf("patient_id = $%d", argIndex))
		args = append(args, filter.PatientID)
		argIndex++
	}

	if filter.TherapistID != "" {
		conditions = append(conditions, fmt.Sprintf("therapist_id = $%d", argIndex))
		args = append(args, filter.TherapistID)
		argIndex++
	}

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, filter.Status)
		argIndex++
	}

	if filter.DateFrom != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, filter.DateFrom)
		argIndex++
	}

	if filter.DateTo != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, filter.DateTo)
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM visit_checklists %s", whereClause)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count checklists: %w", err)
	}

	// Data query
	query := fmt.Sprintf(`
		SELECT id, template_id, template_version, patient_id, therapist_id, clinic_id,
			   status, progress_percentage, started_at, completed_at,
			   created_at, updated_at
		FROM visit_checklists
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, filter.Limit(), filter.Offset())

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list checklists: %w", err)
	}
	defer rows.Close()

	var checklists []model.VisitChecklist
	for rows.Next() {
		var vc model.VisitChecklist
		if err := rows.Scan(
			&vc.ID, &vc.TemplateID, &vc.TemplateVersion, &vc.PatientID,
			&vc.TherapistID, &vc.ClinicID, &vc.Status, &vc.ProgressPercentage,
			&vc.StartedAt, &vc.CompletedAt, &vc.CreatedAt, &vc.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan checklist: %w", err)
		}
		checklists = append(checklists, vc)
	}

	return checklists, total, nil
}

// Create creates a new visit checklist.
func (r *visitChecklistRepo) Create(ctx context.Context, checklist *model.VisitChecklist) error {
	query := `
		INSERT INTO visit_checklists (
			template_id, template_version, patient_id, treatment_session_id,
			assessment_id, therapist_id, clinic_id, status, progress_percentage,
			started_at, created_by, updated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		checklist.TemplateID, checklist.TemplateVersion, checklist.PatientID,
		checklist.TreatmentSessionID, checklist.AssessmentID, checklist.TherapistID,
		checklist.ClinicID, checklist.Status, checklist.ProgressPercentage,
		checklist.StartedAt, checklist.CreatedBy, checklist.UpdatedBy,
	).Scan(&checklist.ID, &checklist.CreatedAt, &checklist.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create checklist: %w", err)
	}

	return nil
}

// Update updates an existing visit checklist.
func (r *visitChecklistRepo) Update(ctx context.Context, checklist *model.VisitChecklist) error {
	query := `
		UPDATE visit_checklists SET
			status = $2, progress_percentage = $3, completed_at = $4,
			locked_at = $5, locked_by = $6, generated_note = $7,
			generated_note_vi = $8, note_generation_status = $9,
			reviewed_by = $10, reviewed_at = $11, review_notes = $12,
			updated_by = $13, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query,
		checklist.ID, checklist.Status, checklist.ProgressPercentage, checklist.CompletedAt,
		checklist.LockedAt, checklist.LockedBy, checklist.GeneratedNote,
		checklist.GeneratedNoteVi, checklist.NoteGenerationStatus,
		checklist.ReviewedBy, checklist.ReviewedAt, checklist.ReviewNotes, checklist.UpdatedBy,
	)

	if err != nil {
		return fmt.Errorf("failed to update checklist: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

// UpdateStatus updates only the status of a checklist.
func (r *visitChecklistRepo) UpdateStatus(ctx context.Context, id string, status model.ChecklistStatus, updatedBy string) error {
	query := `
		UPDATE visit_checklists SET
			status = $2, updated_by = $3, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id, status, updatedBy)
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

// UpdateProgress updates the progress percentage.
func (r *visitChecklistRepo) UpdateProgress(ctx context.Context, id string, progress float64) error {
	query := `UPDATE visit_checklists SET progress_percentage = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id, progress)
	return err
}

// GetResponsesByChecklistID retrieves all responses for a checklist.
func (r *visitChecklistRepo) GetResponsesByChecklistID(ctx context.Context, checklistID string) ([]model.ChecklistResponse, error) {
	query := `
		SELECT id, visit_checklist_id, checklist_item_id, response_value,
			   is_skipped, skip_reason, triggered_alerts, response_history,
			   created_at, updated_at, created_by, updated_by
		FROM visit_checklist_responses
		WHERE visit_checklist_id = $1
	`

	rows, err := r.db.QueryContext(ctx, query, checklistID)
	if err != nil {
		return nil, fmt.Errorf("failed to get responses: %w", err)
	}
	defer rows.Close()

	var responses []model.ChecklistResponse
	for rows.Next() {
		var resp model.ChecklistResponse
		if err := rows.Scan(
			&resp.ID, &resp.VisitChecklistID, &resp.ChecklistItemID, &resp.ResponseValue,
			&resp.IsSkipped, &resp.SkipReason, &resp.TriggeredAlerts, &resp.ResponseHistory,
			&resp.CreatedAt, &resp.UpdatedAt, &resp.CreatedBy, &resp.UpdatedBy,
		); err != nil {
			return nil, fmt.Errorf("failed to scan response: %w", err)
		}
		responses = append(responses, resp)
	}

	return responses, nil
}

// GetResponseByItemID retrieves a response for a specific item.
func (r *visitChecklistRepo) GetResponseByItemID(ctx context.Context, checklistID, itemID string) (*model.ChecklistResponse, error) {
	query := `
		SELECT id, visit_checklist_id, checklist_item_id, response_value,
			   is_skipped, skip_reason, triggered_alerts, response_history,
			   created_at, updated_at, created_by, updated_by
		FROM visit_checklist_responses
		WHERE visit_checklist_id = $1 AND checklist_item_id = $2
	`

	var resp model.ChecklistResponse
	err := r.db.QueryRowContext(ctx, query, checklistID, itemID).Scan(
		&resp.ID, &resp.VisitChecklistID, &resp.ChecklistItemID, &resp.ResponseValue,
		&resp.IsSkipped, &resp.SkipReason, &resp.TriggeredAlerts, &resp.ResponseHistory,
		&resp.CreatedAt, &resp.UpdatedAt, &resp.CreatedBy, &resp.UpdatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get response: %w", err)
	}

	return &resp, nil
}

// UpsertResponse creates or updates a response.
func (r *visitChecklistRepo) UpsertResponse(ctx context.Context, response *model.ChecklistResponse) error {
	query := `
		INSERT INTO visit_checklist_responses (
			visit_checklist_id, checklist_item_id, response_value,
			is_skipped, skip_reason, triggered_alerts, response_history,
			created_by, updated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (visit_checklist_id, checklist_item_id) DO UPDATE SET
			response_value = EXCLUDED.response_value,
			is_skipped = EXCLUDED.is_skipped,
			skip_reason = EXCLUDED.skip_reason,
			triggered_alerts = EXCLUDED.triggered_alerts,
			response_history = EXCLUDED.response_history,
			updated_by = EXCLUDED.updated_by,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		response.VisitChecklistID, response.ChecklistItemID, response.ResponseValue,
		response.IsSkipped, response.SkipReason, response.TriggeredAlerts,
		response.ResponseHistory, response.CreatedBy, response.UpdatedBy,
	).Scan(&response.ID, &response.CreatedAt, &response.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to upsert response: %w", err)
	}

	return nil
}

// UpsertResponses creates or updates multiple responses.
func (r *visitChecklistRepo) UpsertResponses(ctx context.Context, responses []model.ChecklistResponse) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO visit_checklist_responses (
			visit_checklist_id, checklist_item_id, response_value,
			is_skipped, skip_reason, triggered_alerts, response_history,
			created_by, updated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (visit_checklist_id, checklist_item_id) DO UPDATE SET
			response_value = EXCLUDED.response_value,
			is_skipped = EXCLUDED.is_skipped,
			skip_reason = EXCLUDED.skip_reason,
			triggered_alerts = EXCLUDED.triggered_alerts,
			response_history = EXCLUDED.response_history,
			updated_by = EXCLUDED.updated_by,
			updated_at = NOW()
	`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, resp := range responses {
		_, err := stmt.ExecContext(ctx,
			resp.VisitChecklistID, resp.ChecklistItemID, resp.ResponseValue,
			resp.IsSkipped, resp.SkipReason, resp.TriggeredAlerts,
			resp.ResponseHistory, resp.CreatedBy, resp.UpdatedBy,
		)
		if err != nil {
			return fmt.Errorf("failed to upsert response: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// DeleteResponse deletes a response.
func (r *visitChecklistRepo) DeleteResponse(ctx context.Context, checklistID, itemID string) error {
	query := `DELETE FROM visit_checklist_responses WHERE visit_checklist_id = $1 AND checklist_item_id = $2`
	_, err := r.db.ExecContext(ctx, query, checklistID, itemID)
	return err
}

// SaveAutoSaveData saves auto-save data.
func (r *visitChecklistRepo) SaveAutoSaveData(ctx context.Context, id string, data json.RawMessage) error {
	query := `
		UPDATE visit_checklists SET
			auto_save_data = $2, last_auto_save_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, id, data)
	return err
}

// GetAutoSaveData retrieves auto-save data.
func (r *visitChecklistRepo) GetAutoSaveData(ctx context.Context, id string) (json.RawMessage, error) {
	query := `SELECT auto_save_data FROM visit_checklists WHERE id = $1`
	var data json.RawMessage
	err := r.db.QueryRowContext(ctx, query, id).Scan(&data)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return data, err
}

// SaveGeneratedNote saves the generated SOAP note.
func (r *visitChecklistRepo) SaveGeneratedNote(ctx context.Context, id, note, noteVi string) error {
	query := `
		UPDATE visit_checklists SET
			generated_note = $2, generated_note_vi = $3,
			note_generation_status = 'completed', updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, id, note, noteVi)
	return err
}

// GetLastCompletedChecklist retrieves the last completed checklist for a patient.
func (r *visitChecklistRepo) GetLastCompletedChecklist(ctx context.Context, patientID, templateType string) (*model.VisitChecklist, error) {
	query := `
		SELECT vc.id, vc.template_id, vc.template_version, vc.patient_id,
			   vc.therapist_id, vc.clinic_id, vc.status, vc.progress_percentage,
			   vc.completed_at, vc.created_at, vc.updated_at
		FROM visit_checklists vc
		JOIN checklist_templates ct ON ct.id = vc.template_id
		WHERE vc.patient_id = $1 AND ct.template_type = $2
		  AND vc.status IN ('completed', 'reviewed', 'locked')
		ORDER BY vc.completed_at DESC NULLS LAST
		LIMIT 1
	`

	var vc model.VisitChecklist
	err := r.db.QueryRowContext(ctx, query, patientID, templateType).Scan(
		&vc.ID, &vc.TemplateID, &vc.TemplateVersion, &vc.PatientID,
		&vc.TherapistID, &vc.ClinicID, &vc.Status, &vc.ProgressPercentage,
		&vc.CompletedAt, &vc.CreatedAt, &vc.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last checklist: %w", err)
	}

	// Get responses
	responses, err := r.GetResponsesByChecklistID(ctx, vc.ID)
	if err != nil {
		return nil, err
	}
	vc.Responses = responses

	return &vc, nil
}

// CalculateProgress calculates the progress of a checklist.
func (r *visitChecklistRepo) CalculateProgress(ctx context.Context, checklistID string) (float64, error) {
	query := `SELECT calculate_checklist_progress($1)`
	var progress float64
	err := r.db.QueryRowContext(ctx, query, checklistID).Scan(&progress)
	if err != nil {
		// Fallback to manual calculation if function doesn't exist
		return r.calculateProgressManual(ctx, checklistID)
	}
	return progress, nil
}

// calculateProgressManual calculates progress manually.
func (r *visitChecklistRepo) calculateProgressManual(ctx context.Context, checklistID string) (float64, error) {
	// Get checklist to get template ID
	vc, err := r.GetByID(ctx, checklistID)
	if err != nil {
		return 0, err
	}

	// Count total required items
	countRequiredQuery := `
		SELECT COUNT(*)
		FROM checklist_items ci
		JOIN checklist_sections cs ON cs.id = ci.section_id
		WHERE cs.template_id = $1 AND ci.is_required = TRUE
	`
	var totalRequired int
	if err := r.db.QueryRowContext(ctx, countRequiredQuery, vc.TemplateID).Scan(&totalRequired); err != nil {
		return 0, err
	}

	if totalRequired == 0 {
		return 100.0, nil
	}

	// Count completed required items
	countCompletedQuery := `
		SELECT COUNT(*)
		FROM visit_checklist_responses vcr
		JOIN checklist_items ci ON ci.id = vcr.checklist_item_id
		WHERE vcr.visit_checklist_id = $1
		  AND ci.is_required = TRUE
		  AND vcr.is_skipped = FALSE
	`
	var completedRequired int
	if err := r.db.QueryRowContext(ctx, countCompletedQuery, checklistID).Scan(&completedRequired); err != nil {
		return 0, err
	}

	return float64(completedRequired) / float64(totalRequired) * 100, nil
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// parsePostgresArray parses a PostgreSQL array string into a Go slice.
func parsePostgresArray(s string) []string {
	if s == "" || s == "{}" {
		return nil
	}
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		return nil
	}
	return strings.Split(s, ",")
}

// formatPostgresArray formats a Go slice as a PostgreSQL array string.
func formatPostgresArray(arr []string) string {
	if len(arr) == 0 {
		return "{}"
	}
	return "{" + strings.Join(arr, ",") + "}"
}

// =============================================================================
// DOCUMENTATION TIME TRACKING
// =============================================================================

// DocumentationTimeEntry represents a time tracking entry.
type DocumentationTimeEntry struct {
	ID            string    `json:"id" db:"id"`
	VisitChecklistID string `json:"visit_checklist_id" db:"visit_checklist_id"`
	TherapistID   string    `json:"therapist_id" db:"therapist_id"`
	StartTime     time.Time `json:"start_time" db:"start_time"`
	EndTime       *time.Time `json:"end_time,omitempty" db:"end_time"`
	DurationSecs  int       `json:"duration_seconds" db:"duration_seconds"`
	Activity      string    `json:"activity" db:"activity"` // documenting, reviewing, etc.
}
