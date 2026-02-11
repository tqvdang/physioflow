package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// ErrOptimisticLock is returned when an optimistic locking conflict occurs.
var ErrOptimisticLock = fmt.Errorf("optimistic lock conflict: record was modified by another request")

// BillingRepository defines the interface for billing data access.
type BillingRepository interface {
	// Invoices
	CreateInvoice(ctx context.Context, invoice *model.Invoice) error
	GetInvoiceByID(ctx context.Context, id string) (*model.Invoice, error)
	GetPatientInvoices(ctx context.Context, patientID string) ([]*model.Invoice, error)
	UpdateInvoice(ctx context.Context, invoice *model.Invoice) error

	// Payments
	RecordPayment(ctx context.Context, payment *model.Payment) error
	GetPaymentsByInvoiceID(ctx context.Context, invoiceID string) ([]*model.Payment, error)
	GetPaymentsByPatientID(ctx context.Context, patientID string) ([]*model.Payment, error)

	// Service codes
	GetServiceCodes(ctx context.Context) ([]*model.PTServiceCode, error)
	GetServiceCodeByCode(ctx context.Context, code string) (*model.PTServiceCode, error)

	// Invoice number generation
	GetNextInvoiceNumber(ctx context.Context, clinicID string) (string, error)
}

// postgresBillingRepo implements BillingRepository with PostgreSQL.
type postgresBillingRepo struct {
	db *DB
}

// NewBillingRepository creates a new PostgreSQL billing repository.
func NewBillingRepository(db *DB) BillingRepository {
	return &postgresBillingRepo{db: db}
}

// CreateInvoice inserts a new invoice with its line items.
func (r *postgresBillingRepo) CreateInvoice(ctx context.Context, invoice *model.Invoice) error {
	return r.db.WithTx(ctx, func(tx *Tx) error {
		query := `
			INSERT INTO invoices (
				id, clinic_id, patient_id, invoice_number, invoice_date,
				subtotal_amount, discount_amount, tax_amount, total_amount,
				insurance_amount, copay_amount, balance_due, currency,
				status, notes, version, created_by
			) VALUES (
				$1, $2, $3, $4, CURRENT_DATE,
				$5, $6, $7, $8,
				$9, $10, $11, $12,
				$13, $14, 1, $15
			)
			RETURNING created_at, updated_at`

		err := tx.QueryRowContext(ctx, query,
			invoice.ID,
			invoice.ClinicID,
			invoice.PatientID,
			invoice.InvoiceNumber,
			invoice.Subtotal,
			invoice.DiscountAmount,
			invoice.TaxAmount,
			invoice.TotalAmount,
			invoice.InsuranceAmount,
			invoice.PatientAmount,
			invoice.BalanceDue,
			invoice.Currency,
			invoice.Status,
			NullableStringValue(invoice.Notes),
			NullableString(invoice.CreatedBy),
		).Scan(&invoice.CreatedAt, &invoice.UpdatedAt)

		if err != nil {
			return fmt.Errorf("failed to create invoice: %w", err)
		}

		// Insert line items
		for i := range invoice.Items {
			item := &invoice.Items[i]
			itemQuery := `
				INSERT INTO invoice_line_items (
					id, invoice_id, service_code_id, description, description_vi,
					quantity, unit_price, total_price,
					is_bhyt_covered, insurance_covered_amount, sort_order
				) VALUES (
					$1, $2, $3, $4, $5,
					$6, $7, $8,
					$9, $10, $11
				)
				RETURNING created_at`

			err := tx.QueryRowContext(ctx, itemQuery,
				item.ID,
				invoice.ID,
				item.ServiceCodeID,
				item.Description,
				NullableStringValue(item.DescriptionVi),
				item.Quantity,
				item.UnitPrice,
				item.TotalPrice,
				item.BHYTCoverable,
				item.BHYTAmount,
				item.SortOrder,
			).Scan(&item.CreatedAt)

			if err != nil {
				return fmt.Errorf("failed to create invoice line item: %w", err)
			}
		}

		return nil
	})
}

// GetInvoiceByID retrieves an invoice by ID, including line items and payments.
func (r *postgresBillingRepo) GetInvoiceByID(ctx context.Context, id string) (*model.Invoice, error) {
	invoice, err := r.scanInvoice(r.db.QueryRowContext(ctx, `
		SELECT
			id, clinic_id, patient_id, invoice_number,
			subtotal_amount, discount_amount, tax_amount, total_amount,
			insurance_amount, copay_amount, balance_due, currency,
			status, notes, version, created_at, updated_at, created_by, updated_by
		FROM invoices
		WHERE id = $1`, id))

	if err != nil {
		return nil, err
	}

	// Load line items
	items, err := r.getInvoiceItems(ctx, id)
	if err != nil {
		log.Warn().Err(err).Str("invoice_id", id).Msg("failed to load invoice line items")
	} else {
		invoice.Items = items
	}

	// Load payments
	payments, err := r.GetPaymentsByInvoiceID(ctx, id)
	if err != nil {
		log.Warn().Err(err).Str("invoice_id", id).Msg("failed to load invoice payments")
	} else {
		paymentValues := make([]model.Payment, len(payments))
		for i, p := range payments {
			paymentValues[i] = *p
		}
		invoice.Payments = paymentValues
	}

	return invoice, nil
}

// scanInvoice scans a single invoice row.
func (r *postgresBillingRepo) scanInvoice(row *sql.Row) (*model.Invoice, error) {
	var inv model.Invoice
	var notes, createdBy, updatedBy sql.NullString
	var version int

	err := row.Scan(
		&inv.ID,
		&inv.ClinicID,
		&inv.PatientID,
		&inv.InvoiceNumber,
		&inv.Subtotal,
		&inv.DiscountAmount,
		&inv.TaxAmount,
		&inv.TotalAmount,
		&inv.InsuranceAmount,
		&inv.PatientAmount,
		&inv.BalanceDue,
		&inv.Currency,
		&inv.Status,
		&notes,
		&version,
		&inv.CreatedAt,
		&inv.UpdatedAt,
		&createdBy,
		&updatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan invoice: %w", err)
	}

	inv.Notes = StringFromNull(notes)
	inv.CreatedBy = StringPtrFromNull(createdBy)
	inv.UpdatedBy = StringPtrFromNull(updatedBy)

	return &inv, nil
}

// getInvoiceItems retrieves line items for an invoice.
func (r *postgresBillingRepo) getInvoiceItems(ctx context.Context, invoiceID string) ([]model.InvoiceItem, error) {
	query := `
		SELECT
			li.id, li.invoice_id, li.service_code_id, li.description, li.description_vi,
			li.quantity, li.unit_price, li.total_price,
			li.is_bhyt_covered, li.insurance_covered_amount, li.sort_order,
			li.created_at
		FROM invoice_line_items li
		WHERE li.invoice_id = $1
		ORDER BY li.sort_order ASC`

	rows, err := r.db.QueryContext(ctx, query, invoiceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get invoice items: %w", err)
	}
	defer rows.Close()

	items := make([]model.InvoiceItem, 0)
	for rows.Next() {
		var item model.InvoiceItem
		var descVi sql.NullString

		err := rows.Scan(
			&item.ID,
			&item.InvoiceID,
			&item.ServiceCodeID,
			&item.Description,
			&descVi,
			&item.Quantity,
			&item.UnitPrice,
			&item.TotalPrice,
			&item.BHYTCoverable,
			&item.BHYTAmount,
			&item.SortOrder,
			&item.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan invoice item: %w", err)
		}

		item.DescriptionVi = StringFromNull(descVi)
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating invoice items: %w", err)
	}

	return items, nil
}

// GetPatientInvoices retrieves all invoices for a patient.
func (r *postgresBillingRepo) GetPatientInvoices(ctx context.Context, patientID string) ([]*model.Invoice, error) {
	query := `
		SELECT
			id, clinic_id, patient_id, invoice_number,
			subtotal_amount, discount_amount, tax_amount, total_amount,
			insurance_amount, copay_amount, balance_due, currency,
			status, notes, version, created_at, updated_at, created_by, updated_by
		FROM invoices
		WHERE patient_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to get patient invoices: %w", err)
	}
	defer rows.Close()

	invoices := make([]*model.Invoice, 0)
	for rows.Next() {
		var inv model.Invoice
		var notes, createdBy, updatedBy sql.NullString
		var version int

		err := rows.Scan(
			&inv.ID,
			&inv.ClinicID,
			&inv.PatientID,
			&inv.InvoiceNumber,
			&inv.Subtotal,
			&inv.DiscountAmount,
			&inv.TaxAmount,
			&inv.TotalAmount,
			&inv.InsuranceAmount,
			&inv.PatientAmount,
			&inv.BalanceDue,
			&inv.Currency,
			&inv.Status,
			&notes,
			&version,
			&inv.CreatedAt,
			&inv.UpdatedAt,
			&createdBy,
			&updatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan invoice: %w", err)
		}

		_ = version // used for optimistic locking on updates only
		inv.Notes = StringFromNull(notes)
		inv.CreatedBy = StringPtrFromNull(createdBy)
		inv.UpdatedBy = StringPtrFromNull(updatedBy)

		invoices = append(invoices, &inv)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating invoices: %w", err)
	}

	return invoices, nil
}

// UpdateInvoice updates an invoice using optimistic locking.
func (r *postgresBillingRepo) UpdateInvoice(ctx context.Context, invoice *model.Invoice) error {
	query := `
		UPDATE invoices SET
			subtotal_amount = $1,
			discount_amount = $2,
			tax_amount = $3,
			total_amount = $4,
			insurance_amount = $5,
			copay_amount = $6,
			balance_due = $7,
			status = $8,
			notes = $9,
			updated_by = $10,
			version = version + 1
		WHERE id = $11 AND version = (SELECT version FROM invoices WHERE id = $11)
		RETURNING updated_at, version`

	var version int
	err := r.db.QueryRowContext(ctx, query,
		invoice.Subtotal,
		invoice.DiscountAmount,
		invoice.TaxAmount,
		invoice.TotalAmount,
		invoice.InsuranceAmount,
		invoice.PatientAmount,
		invoice.BalanceDue,
		invoice.Status,
		NullableStringValue(invoice.Notes),
		NullableString(invoice.UpdatedBy),
		invoice.ID,
	).Scan(&invoice.UpdatedAt, &version)

	if err == sql.ErrNoRows {
		return ErrOptimisticLock
	}
	if err != nil {
		return fmt.Errorf("failed to update invoice: %w", err)
	}

	return nil
}

// RecordPayment inserts a payment record.
func (r *postgresBillingRepo) RecordPayment(ctx context.Context, payment *model.Payment) error {
	query := `
		INSERT INTO payments (
			id, invoice_id, clinic_id, amount, currency,
			payment_method, payment_date, transaction_reference,
			receipt_number, status, notes, created_by
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11, $12
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		payment.ID,
		payment.InvoiceID,
		payment.ClinicID,
		payment.Amount,
		payment.Currency,
		payment.Method,
		payment.PaidAt,
		NullableStringValue(payment.TransactionRef),
		NullableStringValue(payment.ReceiptNumber),
		payment.Status,
		NullableStringValue(payment.Notes),
		NullableString(payment.CreatedBy),
	).Scan(&payment.CreatedAt, &payment.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to record payment: %w", err)
	}

	return nil
}

// GetPaymentsByInvoiceID retrieves all payments for an invoice.
func (r *postgresBillingRepo) GetPaymentsByInvoiceID(ctx context.Context, invoiceID string) ([]*model.Payment, error) {
	query := `
		SELECT
			id, invoice_id, clinic_id, amount, currency,
			payment_method, payment_date, transaction_reference,
			receipt_number, status, notes, created_at, updated_at, created_by
		FROM payments
		WHERE invoice_id = $1
		ORDER BY payment_date DESC`

	return r.scanPayments(ctx, query, invoiceID)
}

// GetPaymentsByPatientID retrieves all payments for a patient across invoices.
func (r *postgresBillingRepo) GetPaymentsByPatientID(ctx context.Context, patientID string) ([]*model.Payment, error) {
	query := `
		SELECT
			p.id, p.invoice_id, p.clinic_id, p.amount, p.currency,
			p.payment_method, p.payment_date, p.transaction_reference,
			p.receipt_number, p.status, p.notes, p.created_at, p.updated_at, p.created_by
		FROM payments p
		JOIN invoices i ON i.id = p.invoice_id
		WHERE i.patient_id = $1
		ORDER BY p.payment_date DESC`

	return r.scanPayments(ctx, query, patientID)
}

// scanPayments scans payment rows from a query.
func (r *postgresBillingRepo) scanPayments(ctx context.Context, query, arg string) ([]*model.Payment, error) {
	rows, err := r.db.QueryContext(ctx, query, arg)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments: %w", err)
	}
	defer rows.Close()

	payments := make([]*model.Payment, 0)
	for rows.Next() {
		var p model.Payment
		var txRef, receiptNum, notes, createdBy sql.NullString

		err := rows.Scan(
			&p.ID,
			&p.InvoiceID,
			&p.ClinicID,
			&p.Amount,
			&p.Currency,
			&p.Method,
			&p.PaidAt,
			&txRef,
			&receiptNum,
			&p.Status,
			&notes,
			&p.CreatedAt,
			&p.UpdatedAt,
			&createdBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan payment: %w", err)
		}

		p.TransactionRef = StringFromNull(txRef)
		p.ReceiptNumber = StringFromNull(receiptNum)
		p.Notes = StringFromNull(notes)
		p.CreatedBy = StringPtrFromNull(createdBy)

		payments = append(payments, &p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating payments: %w", err)
	}

	return payments, nil
}

// GetServiceCodes retrieves all active PT service codes.
func (r *postgresBillingRepo) GetServiceCodes(ctx context.Context) ([]*model.PTServiceCode, error) {
	query := `
		SELECT
			id, clinic_id, code, service_name, service_name_vi,
			description, description_vi, unit_price, currency,
			duration_minutes, category, is_bhyt_covered,
			bhyt_reimbursement_rate, is_active, created_at, updated_at
		FROM pt_service_codes
		WHERE is_active = true
		ORDER BY code ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get service codes: %w", err)
	}
	defer rows.Close()

	codes := make([]*model.PTServiceCode, 0)
	for rows.Next() {
		sc, err := r.scanServiceCodeRow(rows)
		if err != nil {
			return nil, err
		}
		codes = append(codes, sc)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating service codes: %w", err)
	}

	return codes, nil
}

// GetServiceCodeByCode retrieves a service code by its code string.
func (r *postgresBillingRepo) GetServiceCodeByCode(ctx context.Context, code string) (*model.PTServiceCode, error) {
	query := `
		SELECT
			id, clinic_id, code, service_name, service_name_vi,
			description, description_vi, unit_price, currency,
			duration_minutes, category, is_bhyt_covered,
			bhyt_reimbursement_rate, is_active, created_at, updated_at
		FROM pt_service_codes
		WHERE code = $1 AND is_active = true`

	row := r.db.QueryRowContext(ctx, query, code)

	var sc model.PTServiceCode
	var clinicID, nameVi, desc, descVi, category sql.NullString
	var durationMins sql.NullInt64
	var bhytRate sql.NullFloat64

	err := row.Scan(
		&sc.ID,
		&clinicID,
		&sc.Code,
		&sc.Name,
		&nameVi,
		&desc,
		&descVi,
		&sc.UnitPrice,
		&sc.Currency,
		&durationMins,
		&category,
		&sc.BHYTCoverable,
		&bhytRate,
		&sc.IsActive,
		&sc.CreatedAt,
		&sc.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get service code: %w", err)
	}

	sc.ClinicID = StringPtrFromNull(clinicID)
	sc.NameVi = StringFromNull(nameVi)
	sc.Description = StringFromNull(desc)
	sc.DescriptionVi = StringFromNull(descVi)
	if category.Valid {
		sc.Category = model.ServiceCodeCategory(category.String)
	}
	if durationMins.Valid {
		d := int(durationMins.Int64)
		sc.DurationMins = &d
	}
	if bhytRate.Valid {
		sc.BHYTPrice = &bhytRate.Float64
	}

	return &sc, nil
}

// scanServiceCodeRow scans a service code from sql.Rows.
func (r *postgresBillingRepo) scanServiceCodeRow(rows *sql.Rows) (*model.PTServiceCode, error) {
	var sc model.PTServiceCode
	var clinicID, nameVi, desc, descVi, category sql.NullString
	var durationMins sql.NullInt64
	var bhytRate sql.NullFloat64

	err := rows.Scan(
		&sc.ID,
		&clinicID,
		&sc.Code,
		&sc.Name,
		&nameVi,
		&desc,
		&descVi,
		&sc.UnitPrice,
		&sc.Currency,
		&durationMins,
		&category,
		&sc.BHYTCoverable,
		&bhytRate,
		&sc.IsActive,
		&sc.CreatedAt,
		&sc.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scan service code: %w", err)
	}

	sc.ClinicID = StringPtrFromNull(clinicID)
	sc.NameVi = StringFromNull(nameVi)
	sc.Description = StringFromNull(desc)
	sc.DescriptionVi = StringFromNull(descVi)
	if category.Valid {
		sc.Category = model.ServiceCodeCategory(category.String)
	}
	if durationMins.Valid {
		d := int(durationMins.Int64)
		sc.DurationMins = &d
	}
	if bhytRate.Valid {
		sc.BHYTPrice = &bhytRate.Float64
	}

	return &sc, nil
}

// GetNextInvoiceNumber generates the next invoice number for a clinic.
func (r *postgresBillingRepo) GetNextInvoiceNumber(ctx context.Context, clinicID string) (string, error) {
	query := `
		SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)), 0) + 1
		FROM invoices
		WHERE clinic_id = $1`

	var seq int
	if err := r.db.QueryRowContext(ctx, query, clinicID).Scan(&seq); err != nil {
		return "", fmt.Errorf("failed to get next invoice number: %w", err)
	}

	return fmt.Sprintf("INV-%06d", seq), nil
}

// mockBillingRepo provides a mock implementation for development.
type mockBillingRepo struct{}

// NewMockBillingRepository creates a mock billing repository.
func NewMockBillingRepository() BillingRepository {
	return &mockBillingRepo{}
}

func (r *mockBillingRepo) CreateInvoice(ctx context.Context, invoice *model.Invoice) error {
	return nil
}

func (r *mockBillingRepo) GetInvoiceByID(ctx context.Context, id string) (*model.Invoice, error) {
	return nil, ErrNotFound
}

func (r *mockBillingRepo) GetPatientInvoices(ctx context.Context, patientID string) ([]*model.Invoice, error) {
	return []*model.Invoice{}, nil
}

func (r *mockBillingRepo) UpdateInvoice(ctx context.Context, invoice *model.Invoice) error {
	return nil
}

func (r *mockBillingRepo) RecordPayment(ctx context.Context, payment *model.Payment) error {
	return nil
}

func (r *mockBillingRepo) GetPaymentsByInvoiceID(ctx context.Context, invoiceID string) ([]*model.Payment, error) {
	return []*model.Payment{}, nil
}

func (r *mockBillingRepo) GetPaymentsByPatientID(ctx context.Context, patientID string) ([]*model.Payment, error) {
	return []*model.Payment{}, nil
}

func (r *mockBillingRepo) GetServiceCodes(ctx context.Context) ([]*model.PTServiceCode, error) {
	return []*model.PTServiceCode{}, nil
}

func (r *mockBillingRepo) GetServiceCodeByCode(ctx context.Context, code string) (*model.PTServiceCode, error) {
	return nil, ErrNotFound
}

func (r *mockBillingRepo) GetNextInvoiceNumber(ctx context.Context, clinicID string) (string, error) {
	return "INV-000001", nil
}
