package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	valerr "github.com/tqvdang/physioflow/apps/api/internal/errors"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// BillingService defines the interface for billing business logic.
type BillingService interface {
	// Invoice operations
	CreateInvoice(ctx context.Context, clinicID, patientID, userID string, req *model.CreateInvoiceRequest) (*model.Invoice, error)
	GetInvoice(ctx context.Context, id string) (*model.Invoice, error)
	GetPatientInvoices(ctx context.Context, patientID string) ([]*model.Invoice, error)

	// Billing calculation
	CalculateBilling(ctx context.Context, patientID string, serviceCodes []string) (*model.BillingCalculation, error)

	// Service codes
	GetServiceCodes(ctx context.Context) ([]*model.PTServiceCode, error)

	// Payments
	RecordPayment(ctx context.Context, clinicID, userID string, req *model.RecordPaymentRequest) (*model.Payment, error)
	GetPaymentHistory(ctx context.Context, patientID string) ([]*model.Payment, error)
}

// billingService implements BillingService.
type billingService struct {
	billingRepo repository.BillingRepository
	patientRepo repository.PatientRepository
}

// NewBillingService creates a new billing service.
func NewBillingService(billingRepo repository.BillingRepository, patientRepo repository.PatientRepository) BillingService {
	return &billingService{
		billingRepo: billingRepo,
		patientRepo: patientRepo,
	}
}

// CreateInvoice creates a new invoice for a patient.
func (s *billingService) CreateInvoice(ctx context.Context, clinicID, patientID, userID string, req *model.CreateInvoiceRequest) (*model.Invoice, error) {
	// Validate invoice has >= 1 line item
	if len(req.Items) == 0 {
		return nil, valerr.ErrInvoiceNoLineItems
	}

	// Validate each line item
	for _, item := range req.Items {
		if item.Quantity <= 0 {
			return nil, valerr.NewValidationErrorf(
				"BILLING_INVALID_QUANTITY",
				"line item quantity must be > 0 (got %d for service %s)",
				"So luong muc phai > 0 (nhan duoc %d cho dich vu %s)",
				item.Quantity, item.ServiceCodeID,
			)
		}
	}

	// Generate invoice number
	invoiceNumber, err := s.billingRepo.GetNextInvoiceNumber(ctx, clinicID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate invoice number: %w", err)
	}

	// Look up insurance coverage for the patient
	coveragePercent := 0.0
	insuranceInfo, err := s.patientRepo.GetInsuranceInfo(ctx, patientID)
	if err == nil && len(insuranceInfo) > 0 {
		// Use the first active insurance with valid dates
		now := time.Now()
		for _, ins := range insuranceInfo {
			if ins.ValidTo == nil || ins.ValidTo.After(now) {
				coveragePercent = ins.CoveragePercentage
				break
			}
		}
	}

	// Build line items and calculate totals
	var subtotal float64
	items := make([]model.InvoiceItem, 0, len(req.Items))

	for i, itemReq := range req.Items {
		// Look up service code by ID; we query by code field from the service_code_id
		// The request uses service_code_id which is the UUID of the service code
		sc, err := s.getServiceCodeByID(ctx, itemReq.ServiceCodeID)
		if err != nil {
			return nil, fmt.Errorf("service code not found for ID %s: %w", itemReq.ServiceCodeID, err)
		}

		// Validate service code is active
		if !sc.IsActive {
			return nil, valerr.NewValidationErrorf(
				"BILLING_SERVICE_CODE_INACTIVE",
				"service code %s (%s) is not active",
				"Ma dich vu %s (%s) khong con hieu luc",
				sc.Code, sc.Name,
			)
		}

		// Validate unit price > 0 VND
		if sc.UnitPrice <= 0 {
			return nil, valerr.NewValidationErrorf(
				"BILLING_INVALID_UNIT_PRICE",
				"unit price for service code %s must be > 0 VND (got %.0f)",
				"Don gia cho ma dich vu %s phai > 0 VND (nhan duoc %.0f)",
				sc.Code, sc.UnitPrice,
			)
		}

		lineTotal := sc.UnitPrice * float64(itemReq.Quantity)
		bhytAmount := 0.0
		if sc.BHYTCoverable && coveragePercent > 0 {
			bhytAmount = lineTotal * (coveragePercent / 100)
		}

		item := model.InvoiceItem{
			ID:            uuid.New().String(),
			ServiceCodeID: sc.ID,
			Description:   sc.Name,
			DescriptionVi: sc.NameVi,
			Quantity:      itemReq.Quantity,
			UnitPrice:     sc.UnitPrice,
			TotalPrice:    lineTotal,
			BHYTCoverable: sc.BHYTCoverable,
			BHYTAmount:    roundVND(bhytAmount),
			SortOrder:     i,
			Notes:         itemReq.Notes,
		}

		subtotal += lineTotal
		items = append(items, item)
	}

	// Calculate insurance and copay amounts
	var insuranceAmount float64
	for _, item := range items {
		insuranceAmount += item.BHYTAmount
	}

	totalAmount := subtotal - req.DiscountAmount
	patientAmount := totalAmount - insuranceAmount
	balanceDue := patientAmount // No payments yet

	// Parse optional due date
	var dueAt *time.Time
	if req.DueAt != "" {
		parsed, err := time.Parse("2006-01-02", req.DueAt)
		if err == nil {
			dueAt = &parsed
		}
	}

	now := time.Now()
	invoice := &model.Invoice{
		ID:              uuid.New().String(),
		ClinicID:        clinicID,
		PatientID:       patientID,
		InvoiceNumber:   invoiceNumber,
		Status:          model.InvoiceStatusPending,
		Currency:        "VND",
		Subtotal:        roundVND(subtotal),
		TaxRate:         0, // Vietnam PT services are VAT-exempt
		TaxAmount:       0,
		DiscountAmount:  roundVND(req.DiscountAmount),
		DiscountReason:  req.DiscountReason,
		TotalAmount:     roundVND(totalAmount),
		InsuranceAmount: roundVND(insuranceAmount),
		PatientAmount:   roundVND(patientAmount),
		PaidAmount:      0,
		BalanceDue:      roundVND(balanceDue),
		Notes:           req.Notes,
		NotesVi:         req.NotesVi,
		IssuedAt:        now,
		DueAt:           dueAt,
		CreatedBy:       &userID,
		Items:           items,
	}

	if err := s.billingRepo.CreateInvoice(ctx, invoice); err != nil {
		return nil, fmt.Errorf("failed to create invoice: %w", err)
	}

	log.Info().
		Str("invoice_id", invoice.ID).
		Str("invoice_number", invoice.InvoiceNumber).
		Str("patient_id", patientID).
		Float64("total_amount", invoice.TotalAmount).
		Float64("insurance_amount", invoice.InsuranceAmount).
		Float64("copay_amount", invoice.PatientAmount).
		Str("created_by", userID).
		Msg("invoice created")

	return invoice, nil
}

// getServiceCodeByID finds a service code across all codes by UUID.
func (s *billingService) getServiceCodeByID(ctx context.Context, id string) (*model.PTServiceCode, error) {
	codes, err := s.billingRepo.GetServiceCodes(ctx)
	if err != nil {
		return nil, err
	}
	for _, sc := range codes {
		if sc.ID == id {
			return sc, nil
		}
	}
	return nil, fmt.Errorf("service code not found: %s", id)
}

// GetInvoice retrieves an invoice by ID.
func (s *billingService) GetInvoice(ctx context.Context, id string) (*model.Invoice, error) {
	return s.billingRepo.GetInvoiceByID(ctx, id)
}

// GetPatientInvoices retrieves all invoices for a patient.
func (s *billingService) GetPatientInvoices(ctx context.Context, patientID string) ([]*model.Invoice, error) {
	return s.billingRepo.GetPatientInvoices(ctx, patientID)
}

// CalculateBilling calculates billing amounts for a set of service codes without persisting.
func (s *billingService) CalculateBilling(ctx context.Context, patientID string, serviceCodes []string) (*model.BillingCalculation, error) {
	// Get insurance coverage for patient
	coveragePercent := 0.0
	insuranceInfo, err := s.patientRepo.GetInsuranceInfo(ctx, patientID)
	if err == nil && len(insuranceInfo) > 0 {
		now := time.Now()
		for _, ins := range insuranceInfo {
			if ins.ValidTo == nil || ins.ValidTo.After(now) {
				coveragePercent = ins.CoveragePercentage
				break
			}
		}
	}

	// Calculate total from service codes
	var total float64
	var insurancePays float64
	lineItems := make([]model.BillingLineItem, 0, len(serviceCodes))

	for _, code := range serviceCodes {
		sc, err := s.billingRepo.GetServiceCodeByCode(ctx, code)
		if err != nil {
			return nil, fmt.Errorf("service code %q not found: %w", code, err)
		}

		bhytAmount := 0.0
		if sc.BHYTCoverable && coveragePercent > 0 {
			bhytAmount = sc.UnitPrice * (coveragePercent / 100)
		}

		lineItems = append(lineItems, model.BillingLineItem{
			Code:            sc.Code,
			Name:            sc.Name,
			NameVi:          sc.NameVi,
			UnitPrice:       sc.UnitPrice,
			Currency:        sc.Currency,
			BHYTCoverable:   sc.BHYTCoverable,
			InsuranceAmount: roundVND(bhytAmount),
			PatientAmount:   roundVND(sc.UnitPrice - bhytAmount),
		})

		total += sc.UnitPrice
		insurancePays += bhytAmount
	}

	copay := total - insurancePays

	return &model.BillingCalculation{
		PatientID:       patientID,
		TotalAmount:     roundVND(total),
		InsuranceAmount: roundVND(insurancePays),
		CopayAmount:     roundVND(copay),
		CoveragePercent: coveragePercent,
		Currency:        "VND",
		LineItems:       lineItems,
		CalculatedAt:    time.Now(),
	}, nil
}

// GetServiceCodes retrieves all active PT service codes.
func (s *billingService) GetServiceCodes(ctx context.Context) ([]*model.PTServiceCode, error) {
	return s.billingRepo.GetServiceCodes(ctx)
}

// RecordPayment records a payment against an invoice and updates invoice status.
func (s *billingService) RecordPayment(ctx context.Context, clinicID, userID string, req *model.RecordPaymentRequest) (*model.Payment, error) {
	// Get the invoice to validate and calculate balance
	invoice, err := s.billingRepo.GetInvoiceByID(ctx, req.InvoiceID)
	if err != nil {
		return nil, fmt.Errorf("invoice not found: %w", err)
	}

	// Validate invoice can accept payments
	if invoice.Status == model.InvoiceStatusCancelled || invoice.Status == model.InvoiceStatusRefunded {
		return nil, fmt.Errorf("cannot record payment on %s invoice", invoice.Status)
	}

	if invoice.Status == model.InvoiceStatusPaid {
		return nil, fmt.Errorf("invoice is already fully paid")
	}

	// Handle overpayment: if payment > balance due, create credit balance instead of rejecting
	var creditAmount float64
	if req.Amount > invoice.BalanceDue && invoice.BalanceDue > 0 {
		creditAmount = req.Amount - invoice.BalanceDue
		log.Info().
			Float64("payment_amount", req.Amount).
			Float64("balance_due", invoice.BalanceDue).
			Float64("credit_amount", creditAmount).
			Str("invoice_id", req.InvoiceID).
			Msg("overpayment detected; excess will be applied as credit")
	}

	// Parse payment time
	paidAt := time.Now()
	if req.PaidAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.PaidAt)
		if err == nil {
			paidAt = parsed
		}
	}

	payment := &model.Payment{
		ID:             uuid.New().String(),
		InvoiceID:      req.InvoiceID,
		ClinicID:       clinicID,
		Amount:         req.Amount,
		Currency:       "VND",
		Method:         model.PaymentMethod(req.Method),
		Status:         model.PaymentStatusCompleted,
		TransactionRef: req.TransactionRef,
		Notes:          req.Notes,
		PaidAt:         paidAt,
		CreatedBy:      &userID,
	}

	if err := s.billingRepo.RecordPayment(ctx, payment); err != nil {
		return nil, fmt.Errorf("failed to record payment: %w", err)
	}

	// Update invoice paid amount and status
	effectivePayment := req.Amount
	if creditAmount > 0 {
		effectivePayment = invoice.BalanceDue // Only apply up to balance
	}
	invoice.PaidAmount += effectivePayment
	invoice.BalanceDue = roundVND(invoice.PatientAmount - invoice.PaidAmount)
	if invoice.BalanceDue <= 0 {
		invoice.BalanceDue = 0
		invoice.Status = model.InvoiceStatusPaid
		now := time.Now()
		invoice.PaidAt = &now
	} else {
		invoice.Status = model.InvoiceStatusPartial
	}
	invoice.UpdatedBy = &userID

	// Log credit amount for future handling (e.g., apply to next invoice)
	if creditAmount > 0 {
		log.Info().
			Float64("credit_amount", creditAmount).
			Str("patient_id", invoice.PatientID).
			Str("invoice_id", invoice.ID).
			Msg("credit balance created from overpayment")
	}

	if err := s.billingRepo.UpdateInvoice(ctx, invoice); err != nil {
		log.Error().Err(err).Str("invoice_id", invoice.ID).Msg("failed to update invoice after payment")
		// Payment was recorded; log error but don't fail the request
	}

	log.Info().
		Str("payment_id", payment.ID).
		Str("invoice_id", req.InvoiceID).
		Float64("amount", req.Amount).
		Str("method", req.Method).
		Str("new_status", string(invoice.Status)).
		Str("recorded_by", userID).
		Msg("payment recorded")

	return payment, nil
}

// GetPaymentHistory retrieves all payments for a patient.
func (s *billingService) GetPaymentHistory(ctx context.Context, patientID string) ([]*model.Payment, error) {
	return s.billingRepo.GetPaymentsByPatientID(ctx, patientID)
}

// roundVND rounds to whole VND (no decimals for Vietnamese Dong).
func roundVND(amount float64) float64 {
	return math.Round(amount)
}
