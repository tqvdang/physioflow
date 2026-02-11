package repository

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"time"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// BHYTClaimRepository defines the interface for BHYT claim data access.
type BHYTClaimRepository interface {
	// Claims
	CreateClaim(ctx context.Context, claim *model.BHYTClaim) error
	GetClaimByID(ctx context.Context, id string) (*model.BHYTClaim, error)
	ListClaims(ctx context.Context, params model.BHYTClaimSearchParams) ([]model.BHYTClaim, int64, error)
	UpdateClaimStatus(ctx context.Context, id string, status model.BHYTClaimStatus, updatedBy *string) error

	// Line items
	CreateLineItems(ctx context.Context, items []model.BHYTClaimLineItem) error
	GetLineItemsByClaimID(ctx context.Context, claimID string) ([]model.BHYTClaimLineItem, error)

	// Billable data query for claim generation
	GetBillableServices(ctx context.Context, clinicID string, facilityCode string, month, year int) ([]model.BHYTClaimLineItem, error)
}

// postgresBHYTClaimRepo implements BHYTClaimRepository with PostgreSQL.
type postgresBHYTClaimRepo struct {
	db *DB
}

// NewBHYTClaimRepository creates a new PostgreSQL BHYT claim repository.
func NewBHYTClaimRepository(db *DB) BHYTClaimRepository {
	return &postgresBHYTClaimRepo{db: db}
}

// CreateClaim inserts a new BHYT claim record.
func (r *postgresBHYTClaimRepo) CreateClaim(ctx context.Context, claim *model.BHYTClaim) error {
	query := `
		INSERT INTO bhyt_claims (
			id, clinic_id, facility_code, month, year,
			file_path, file_name, status,
			total_amount, total_insurance_amount, total_patient_amount,
			line_item_count, notes, created_by
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11,
			$12, $13, $14
		)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		claim.ID,
		claim.ClinicID,
		claim.FacilityCode,
		claim.Month,
		claim.Year,
		NullableStringValue(claim.FilePath),
		NullableStringValue(claim.FileName),
		claim.Status,
		claim.TotalAmount,
		claim.TotalInsuranceAmount,
		claim.TotalPatientAmount,
		claim.LineItemCount,
		NullableStringValue(claim.Notes),
		NullableString(claim.CreatedBy),
	).Scan(&claim.CreatedAt, &claim.UpdatedAt)
}

// GetClaimByID retrieves a BHYT claim by ID, including line items.
func (r *postgresBHYTClaimRepo) GetClaimByID(ctx context.Context, id string) (*model.BHYTClaim, error) {
	query := `
		SELECT
			id, clinic_id, facility_code, month, year,
			file_path, file_name, status,
			total_amount, total_insurance_amount, total_patient_amount,
			line_item_count, rejection_reason, notes,
			created_at, updated_at, submitted_at, approved_at, rejected_at,
			created_by, updated_by
		FROM bhyt_claims
		WHERE id = $1`

	var claim model.BHYTClaim
	var filePath, fileName, rejectionReason, notes sql.NullString
	var createdBy, updatedBy sql.NullString
	var submittedAt, approvedAt, rejectedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&claim.ID,
		&claim.ClinicID,
		&claim.FacilityCode,
		&claim.Month,
		&claim.Year,
		&filePath,
		&fileName,
		&claim.Status,
		&claim.TotalAmount,
		&claim.TotalInsuranceAmount,
		&claim.TotalPatientAmount,
		&claim.LineItemCount,
		&rejectionReason,
		&notes,
		&claim.CreatedAt,
		&claim.UpdatedAt,
		&submittedAt,
		&approvedAt,
		&rejectedAt,
		&createdBy,
		&updatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get BHYT claim: %w", err)
	}

	claim.FilePath = StringFromNull(filePath)
	claim.FileName = StringFromNull(fileName)
	claim.RejectionReason = StringFromNull(rejectionReason)
	claim.Notes = StringFromNull(notes)
	claim.CreatedBy = StringPtrFromNull(createdBy)
	claim.UpdatedBy = StringPtrFromNull(updatedBy)
	claim.SubmittedAt = TimePtrFromNull(submittedAt)
	claim.ApprovedAt = TimePtrFromNull(approvedAt)
	claim.RejectedAt = TimePtrFromNull(rejectedAt)

	// Load line items
	items, err := r.GetLineItemsByClaimID(ctx, id)
	if err == nil {
		claim.LineItems = items
	}

	return &claim, nil
}

// ListClaims retrieves a paginated list of BHYT claims.
func (r *postgresBHYTClaimRepo) ListClaims(ctx context.Context, params model.BHYTClaimSearchParams) ([]model.BHYTClaim, int64, error) {
	// Count query
	countQuery := `SELECT COUNT(*) FROM bhyt_claims WHERE clinic_id = $1`
	countArgs := []interface{}{params.ClinicID}
	argIdx := 2

	if params.FacilityCode != "" {
		countQuery += fmt.Sprintf(" AND facility_code = $%d", argIdx)
		countArgs = append(countArgs, params.FacilityCode)
		argIdx++
	}
	if params.Status != "" {
		countQuery += fmt.Sprintf(" AND status = $%d", argIdx)
		countArgs = append(countArgs, params.Status)
		argIdx++
	}
	if params.Year > 0 {
		countQuery += fmt.Sprintf(" AND year = $%d", argIdx)
		countArgs = append(countArgs, params.Year)
		argIdx++
	}
	if params.Month > 0 {
		countQuery += fmt.Sprintf(" AND month = $%d", argIdx)
		countArgs = append(countArgs, params.Month)
		argIdx++
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count BHYT claims: %w", err)
	}

	// Data query
	dataQuery := `
		SELECT
			id, clinic_id, facility_code, month, year,
			file_path, file_name, status,
			total_amount, total_insurance_amount, total_patient_amount,
			line_item_count, rejection_reason, notes,
			created_at, updated_at, submitted_at, approved_at, rejected_at,
			created_by, updated_by
		FROM bhyt_claims
		WHERE clinic_id = $1`
	dataArgs := []interface{}{params.ClinicID}
	dataArgIdx := 2

	if params.FacilityCode != "" {
		dataQuery += fmt.Sprintf(" AND facility_code = $%d", dataArgIdx)
		dataArgs = append(dataArgs, params.FacilityCode)
		dataArgIdx++
	}
	if params.Status != "" {
		dataQuery += fmt.Sprintf(" AND status = $%d", dataArgIdx)
		dataArgs = append(dataArgs, params.Status)
		dataArgIdx++
	}
	if params.Year > 0 {
		dataQuery += fmt.Sprintf(" AND year = $%d", dataArgIdx)
		dataArgs = append(dataArgs, params.Year)
		dataArgIdx++
	}
	if params.Month > 0 {
		dataQuery += fmt.Sprintf(" AND month = $%d", dataArgIdx)
		dataArgs = append(dataArgs, params.Month)
		dataArgIdx++
	}

	// Sorting
	sortBy := "created_at"
	if params.SortBy == "year" || params.SortBy == "month" || params.SortBy == "status" || params.SortBy == "total_amount" {
		sortBy = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	dataQuery += fmt.Sprintf(" ORDER BY %s %s", sortBy, sortOrder)

	// Pagination
	dataQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", dataArgIdx, dataArgIdx+1)
	dataArgs = append(dataArgs, params.Limit(), params.Offset())

	rows, err := r.db.QueryContext(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list BHYT claims: %w", err)
	}
	defer rows.Close()

	claims := make([]model.BHYTClaim, 0)
	for rows.Next() {
		var claim model.BHYTClaim
		var filePath, fileName, rejectionReason, notes sql.NullString
		var createdBy, updatedBy sql.NullString
		var submittedAt, approvedAt, rejectedAt sql.NullTime

		err := rows.Scan(
			&claim.ID,
			&claim.ClinicID,
			&claim.FacilityCode,
			&claim.Month,
			&claim.Year,
			&filePath,
			&fileName,
			&claim.Status,
			&claim.TotalAmount,
			&claim.TotalInsuranceAmount,
			&claim.TotalPatientAmount,
			&claim.LineItemCount,
			&rejectionReason,
			&notes,
			&claim.CreatedAt,
			&claim.UpdatedAt,
			&submittedAt,
			&approvedAt,
			&rejectedAt,
			&createdBy,
			&updatedBy,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan BHYT claim: %w", err)
		}

		claim.FilePath = StringFromNull(filePath)
		claim.FileName = StringFromNull(fileName)
		claim.RejectionReason = StringFromNull(rejectionReason)
		claim.Notes = StringFromNull(notes)
		claim.CreatedBy = StringPtrFromNull(createdBy)
		claim.UpdatedBy = StringPtrFromNull(updatedBy)
		claim.SubmittedAt = TimePtrFromNull(submittedAt)
		claim.ApprovedAt = TimePtrFromNull(approvedAt)
		claim.RejectedAt = TimePtrFromNull(rejectedAt)

		claims = append(claims, claim)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating BHYT claims: %w", err)
	}

	return claims, total, nil
}

// UpdateClaimStatus updates the status of a BHYT claim.
func (r *postgresBHYTClaimRepo) UpdateClaimStatus(ctx context.Context, id string, status model.BHYTClaimStatus, updatedBy *string) error {
	var timestampCol string
	switch status {
	case model.BHYTClaimStatusSubmitted:
		timestampCol = "submitted_at"
	case model.BHYTClaimStatusApproved:
		timestampCol = "approved_at"
	case model.BHYTClaimStatusRejected:
		timestampCol = "rejected_at"
	}

	query := fmt.Sprintf(`
		UPDATE bhyt_claims
		SET status = $1, updated_by = $2%s
		WHERE id = $3`,
		func() string {
			if timestampCol != "" {
				return fmt.Sprintf(", %s = NOW()", timestampCol)
			}
			return ""
		}(),
	)

	result, err := r.db.ExecContext(ctx, query, status, NullableString(updatedBy), id)
	if err != nil {
		return fmt.Errorf("failed to update BHYT claim status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// CreateLineItems inserts BHYT claim line items in batch.
func (r *postgresBHYTClaimRepo) CreateLineItems(ctx context.Context, items []model.BHYTClaimLineItem) error {
	if len(items) == 0 {
		return nil
	}

	return r.db.WithTx(ctx, func(tx *Tx) error {
		query := `
			INSERT INTO bhyt_claim_line_items (
				id, claim_id, invoice_id, patient_id, patient_name,
				bhyt_card_number, service_code, service_name_vi,
				quantity, unit_price, total_price,
				insurance_paid, patient_paid, service_date
			) VALUES (
				$1, $2, $3, $4, $5,
				$6, $7, $8,
				$9, $10, $11,
				$12, $13, $14
			)
			RETURNING created_at`

		for i := range items {
			item := &items[i]
			err := tx.QueryRowContext(ctx, query,
				item.ID,
				item.ClaimID,
				NullableString(item.InvoiceID),
				item.PatientID,
				item.PatientName,
				item.BHYTCardNumber,
				item.ServiceCode,
				item.ServiceNameVi,
				item.Quantity,
				item.UnitPrice,
				item.TotalPrice,
				item.InsurancePaid,
				item.PatientPaid,
				item.ServiceDate,
			).Scan(&item.CreatedAt)

			if err != nil {
				return fmt.Errorf("failed to create BHYT claim line item: %w", err)
			}
		}

		return nil
	})
}

// GetLineItemsByClaimID retrieves all line items for a BHYT claim.
func (r *postgresBHYTClaimRepo) GetLineItemsByClaimID(ctx context.Context, claimID string) ([]model.BHYTClaimLineItem, error) {
	query := `
		SELECT
			id, claim_id, invoice_id, patient_id, patient_name,
			bhyt_card_number, service_code, service_name_vi,
			quantity, unit_price, total_price,
			insurance_paid, patient_paid, service_date, created_at
		FROM bhyt_claim_line_items
		WHERE claim_id = $1
		ORDER BY patient_name ASC, service_date ASC`

	rows, err := r.db.QueryContext(ctx, query, claimID)
	if err != nil {
		return nil, fmt.Errorf("failed to get BHYT claim line items: %w", err)
	}
	defer rows.Close()

	items := make([]model.BHYTClaimLineItem, 0)
	for rows.Next() {
		var item model.BHYTClaimLineItem
		var invoiceID sql.NullString

		err := rows.Scan(
			&item.ID,
			&item.ClaimID,
			&invoiceID,
			&item.PatientID,
			&item.PatientName,
			&item.BHYTCardNumber,
			&item.ServiceCode,
			&item.ServiceNameVi,
			&item.Quantity,
			&item.UnitPrice,
			&item.TotalPrice,
			&item.InsurancePaid,
			&item.PatientPaid,
			&item.ServiceDate,
			&item.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan BHYT claim line item: %w", err)
		}

		item.InvoiceID = StringPtrFromNull(invoiceID)
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating BHYT claim line items: %w", err)
	}

	return items, nil
}

// GetBillableServices queries all billable services with BHYT coverage for a given period.
// This joins invoices with line items and insurance info to build claim data.
func (r *postgresBHYTClaimRepo) GetBillableServices(ctx context.Context, clinicID string, facilityCode string, month, year int) ([]model.BHYTClaimLineItem, error) {
	// Calculate date range for the given month/year
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0)

	query := `
		SELECT
			i.id AS invoice_id,
			i.patient_id,
			COALESCE(p.last_name || ' ' || p.first_name, 'N/A') AS patient_name,
			COALESCE(ii.card_number, '') AS bhyt_card_number,
			sc.code AS service_code,
			COALESCE(sc.service_name_vi, sc.service_name) AS service_name_vi,
			li.quantity,
			li.unit_price,
			li.total_price,
			li.insurance_covered_amount AS insurance_paid,
			(li.total_price - li.insurance_covered_amount) AS patient_paid,
			COALESCE(i.invoice_date, i.created_at::date) AS service_date
		FROM invoices i
		JOIN invoice_line_items li ON li.invoice_id = i.id
		JOIN pt_service_codes sc ON sc.id = li.service_code_id
		JOIN patients p ON p.id = i.patient_id
		LEFT JOIN insurance_info ii ON ii.patient_id = i.patient_id AND ii.is_active = true
		WHERE i.clinic_id = $1
		  AND li.is_bhyt_covered = true
		  AND li.insurance_covered_amount > 0
		  AND COALESCE(i.invoice_date, i.created_at::date) >= $2
		  AND COALESCE(i.invoice_date, i.created_at::date) < $3
		  AND i.status IN ('pending', 'paid', 'partially_paid')
		ORDER BY p.last_name, p.first_name, service_date`

	rows, err := r.db.QueryContext(ctx, query, clinicID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query billable services: %w", err)
	}
	defer rows.Close()

	items := make([]model.BHYTClaimLineItem, 0)
	for rows.Next() {
		var item model.BHYTClaimLineItem
		var invoiceID string

		err := rows.Scan(
			&invoiceID,
			&item.PatientID,
			&item.PatientName,
			&item.BHYTCardNumber,
			&item.ServiceCode,
			&item.ServiceNameVi,
			&item.Quantity,
			&item.UnitPrice,
			&item.TotalPrice,
			&item.InsurancePaid,
			&item.PatientPaid,
			&item.ServiceDate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan billable service: %w", err)
		}

		item.InvoiceID = &invoiceID
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating billable services: %w", err)
	}

	return items, nil
}

// --- Mock implementation ---

// mockBHYTClaimRepo provides a mock implementation for development.
type mockBHYTClaimRepo struct{}

// NewMockBHYTClaimRepository creates a mock BHYT claim repository.
func NewMockBHYTClaimRepository() BHYTClaimRepository {
	return &mockBHYTClaimRepo{}
}

func (r *mockBHYTClaimRepo) CreateClaim(ctx context.Context, claim *model.BHYTClaim) error {
	claim.CreatedAt = time.Now()
	claim.UpdatedAt = time.Now()
	return nil
}

func (r *mockBHYTClaimRepo) GetClaimByID(ctx context.Context, id string) (*model.BHYTClaim, error) {
	return nil, ErrNotFound
}

func (r *mockBHYTClaimRepo) ListClaims(ctx context.Context, params model.BHYTClaimSearchParams) ([]model.BHYTClaim, int64, error) {
	return []model.BHYTClaim{}, 0, nil
}

func (r *mockBHYTClaimRepo) UpdateClaimStatus(ctx context.Context, id string, status model.BHYTClaimStatus, updatedBy *string) error {
	return nil
}

func (r *mockBHYTClaimRepo) CreateLineItems(ctx context.Context, items []model.BHYTClaimLineItem) error {
	return nil
}

func (r *mockBHYTClaimRepo) GetLineItemsByClaimID(ctx context.Context, claimID string) ([]model.BHYTClaimLineItem, error) {
	return []model.BHYTClaimLineItem{}, nil
}

func (r *mockBHYTClaimRepo) GetBillableServices(ctx context.Context, clinicID string, facilityCode string, month, year int) ([]model.BHYTClaimLineItem, error) {
	return []model.BHYTClaimLineItem{}, nil
}

// Ensure interface compliance.
var _ BHYTClaimRepository = (*postgresBHYTClaimRepo)(nil)
var _ BHYTClaimRepository = (*mockBHYTClaimRepo)(nil)

// ceil helper for pagination.
func ceilDiv(a, b int) int {
	return int(math.Ceil(float64(a) / float64(b)))
}
