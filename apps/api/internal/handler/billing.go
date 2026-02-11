package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// BillingHandler handles billing-related HTTP requests.
type BillingHandler struct {
	svc *service.Service
}

// NewBillingHandler creates a new BillingHandler.
func NewBillingHandler(svc *service.Service) *BillingHandler {
	return &BillingHandler{svc: svc}
}

// --- Response types ---

// ServiceCodeResponse represents a PT service code in API responses.
type ServiceCodeResponse struct {
	ID            string   `json:"id"`
	ClinicID      *string  `json:"clinic_id,omitempty"`
	Code          string   `json:"code"`
	Name          string   `json:"name"`
	NameVi        string   `json:"name_vi"`
	Description   string   `json:"description,omitempty"`
	DescriptionVi string   `json:"description_vi,omitempty"`
	Category      string   `json:"category"`
	UnitPrice     float64  `json:"unit_price"`
	Currency      string   `json:"currency"`
	DurationMins  *int     `json:"duration_mins,omitempty"`
	BHYTCoverable bool     `json:"bhyt_coverable"`
	BHYTPrice     *float64 `json:"bhyt_price,omitempty"`
	IsActive      bool     `json:"is_active"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

// InvoiceResponse represents an invoice in API responses.
type InvoiceResponse struct {
	ID              string                `json:"id"`
	ClinicID        string                `json:"clinic_id"`
	PatientID       string                `json:"patient_id"`
	InvoiceNumber   string                `json:"invoice_number"`
	Status          string                `json:"status"`
	Currency        string                `json:"currency"`
	Subtotal        float64               `json:"subtotal"`
	TaxAmount       float64               `json:"tax_amount"`
	DiscountAmount  float64               `json:"discount_amount"`
	DiscountReason  string                `json:"discount_reason,omitempty"`
	TotalAmount     float64               `json:"total_amount"`
	InsuranceAmount float64               `json:"insurance_amount"`
	PatientAmount   float64               `json:"patient_amount"`
	PaidAmount      float64               `json:"paid_amount"`
	BalanceDue      float64               `json:"balance_due"`
	Notes           string                `json:"notes,omitempty"`
	NotesVi         string                `json:"notes_vi,omitempty"`
	IssuedAt        string                `json:"issued_at"`
	DueAt           *string               `json:"due_at,omitempty"`
	PaidAt          *string               `json:"paid_at,omitempty"`
	CreatedAt       string                `json:"created_at"`
	UpdatedAt       string                `json:"updated_at"`
	Items           []InvoiceItemResponse `json:"items,omitempty"`
	Payments        []PaymentResponse     `json:"payments,omitempty"`
}

// InvoiceItemResponse represents an invoice line item in API responses.
type InvoiceItemResponse struct {
	ID            string  `json:"id"`
	ServiceCodeID string  `json:"service_code_id"`
	Description   string  `json:"description"`
	DescriptionVi string  `json:"description_vi,omitempty"`
	Quantity      int     `json:"quantity"`
	UnitPrice     float64 `json:"unit_price"`
	TotalPrice    float64 `json:"total_price"`
	BHYTCoverable bool    `json:"bhyt_coverable"`
	BHYTAmount    float64 `json:"bhyt_amount"`
	SortOrder     int     `json:"sort_order"`
}

// PaymentResponse represents a payment in API responses.
type PaymentResponse struct {
	ID             string  `json:"id"`
	InvoiceID      string  `json:"invoice_id"`
	ClinicID       string  `json:"clinic_id"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	Method         string  `json:"method"`
	Status         string  `json:"status"`
	TransactionRef string  `json:"transaction_ref,omitempty"`
	ReceiptNumber  string  `json:"receipt_number,omitempty"`
	Notes          string  `json:"notes,omitempty"`
	PaidAt         string  `json:"paid_at"`
	CreatedAt      string  `json:"created_at"`
}

// BillingCalculationResponse represents a billing calculation in API responses.
type BillingCalculationResponse struct {
	PatientID       string                    `json:"patient_id"`
	TotalAmount     float64                   `json:"total_amount"`
	InsuranceAmount float64                   `json:"insurance_amount"`
	CopayAmount     float64                   `json:"copay_amount"`
	CoveragePercent float64                   `json:"coverage_percent"`
	Currency        string                    `json:"currency"`
	LineItems       []BillingLineItemResponse `json:"line_items"`
	CalculatedAt    string                    `json:"calculated_at"`
}

// BillingLineItemResponse represents a line item in a billing calculation response.
type BillingLineItemResponse struct {
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	NameVi          string  `json:"name_vi"`
	UnitPrice       float64 `json:"unit_price"`
	Currency        string  `json:"currency"`
	BHYTCoverable   bool    `json:"bhyt_coverable"`
	InsuranceAmount float64 `json:"insurance_amount"`
	PatientAmount   float64 `json:"patient_amount"`
}

// --- Handlers ---

// CreateInvoice creates a new invoice for a patient.
// @Summary Create invoice
// @Description Creates a new billing invoice for a patient
// @Tags billing
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param invoice body model.CreateInvoiceRequest true "Invoice data"
// @Success 201 {object} InvoiceResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/billing/invoice [post]
func (h *BillingHandler) CreateInvoice(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("patientId")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	var req model.CreateInvoiceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	// Override patient_id from path param
	req.PatientID = patientID

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	invoice, err := h.svc.Billing().CreateInvoice(c.Request().Context(), user.ClinicID, patientID, user.UserID, &req)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to create invoice")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create invoice",
		})
	}

	return c.JSON(http.StatusCreated, toInvoiceResponse(invoice))
}

// GetInvoice retrieves an invoice by ID.
// @Summary Get invoice
// @Description Retrieves an invoice by ID
// @Tags billing
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param id path string true "Invoice ID"
// @Success 200 {object} InvoiceResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/billing/invoice/{id} [get]
func (h *BillingHandler) GetInvoice(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Invoice ID is required",
		})
	}

	invoice, err := h.svc.Billing().GetInvoice(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Invoice not found",
			})
		}
		log.Error().Err(err).Str("invoice_id", id).Msg("failed to get invoice")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve invoice",
		})
	}

	return c.JSON(http.StatusOK, toInvoiceResponse(invoice))
}

// CalculateBilling calculates billing amounts for service codes without creating an invoice.
// @Summary Calculate billing
// @Description Calculates billing amounts including insurance coverage and copay
// @Tags billing
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param body body model.CalculateBillingRequest true "Service codes to calculate"
// @Success 200 {object} BillingCalculationResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/billing/calculate [post]
func (h *BillingHandler) CalculateBilling(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("patientId")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	var req model.CalculateBillingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	calc, err := h.svc.Billing().CalculateBilling(c.Request().Context(), patientID, req.ServiceCodes)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "One or more service codes not found",
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to calculate billing")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to calculate billing",
		})
	}

	return c.JSON(http.StatusOK, toBillingCalculationResponse(calc))
}

// GetServiceCodes retrieves all active PT service codes.
// @Summary Get service codes
// @Description Retrieves all active PT service codes with bilingual names
// @Tags billing
// @Accept json
// @Produce json
// @Success 200 {array} ServiceCodeResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/billing/service-codes [get]
func (h *BillingHandler) GetServiceCodes(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	codes, err := h.svc.Billing().GetServiceCodes(c.Request().Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to get service codes")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve service codes",
		})
	}

	results := make([]ServiceCodeResponse, len(codes))
	for i, sc := range codes {
		results[i] = toServiceCodeResponse(sc)
	}

	return c.JSON(http.StatusOK, results)
}

// RecordPayment records a payment against an invoice.
// @Summary Record payment
// @Description Records a payment against a patient's invoice
// @Tags billing
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param payment body model.RecordPaymentRequest true "Payment data"
// @Success 201 {object} PaymentResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/billing/payment [post]
func (h *BillingHandler) RecordPayment(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.RecordPaymentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	payment, err := h.svc.Billing().RecordPayment(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Invoice not found",
			})
		}
		log.Error().Err(err).Str("invoice_id", req.InvoiceID).Msg("failed to record payment")
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "payment_error",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, toPaymentResponse(payment))
}

// GetPaymentHistory retrieves payment history for a patient.
// @Summary Get payment history
// @Description Retrieves all payment records for a patient
// @Tags billing
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} PaymentResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/billing/history [get]
func (h *BillingHandler) GetPaymentHistory(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("patientId")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	payments, err := h.svc.Billing().GetPaymentHistory(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get payment history")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve payment history",
		})
	}

	results := make([]PaymentResponse, len(payments))
	for i, p := range payments {
		results[i] = toPaymentResponse(p)
	}

	return c.JSON(http.StatusOK, results)
}

// --- Response converters ---

func toServiceCodeResponse(sc *model.PTServiceCode) ServiceCodeResponse {
	return ServiceCodeResponse{
		ID:            sc.ID,
		ClinicID:      sc.ClinicID,
		Code:          sc.Code,
		Name:          sc.Name,
		NameVi:        sc.NameVi,
		Description:   sc.Description,
		DescriptionVi: sc.DescriptionVi,
		Category:      string(sc.Category),
		UnitPrice:     sc.UnitPrice,
		Currency:      sc.Currency,
		DurationMins:  sc.DurationMins,
		BHYTCoverable: sc.BHYTCoverable,
		BHYTPrice:     sc.BHYTPrice,
		IsActive:      sc.IsActive,
		CreatedAt:     sc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     sc.UpdatedAt.Format(time.RFC3339),
	}
}

func toInvoiceResponse(inv *model.Invoice) InvoiceResponse {
	resp := InvoiceResponse{
		ID:              inv.ID,
		ClinicID:        inv.ClinicID,
		PatientID:       inv.PatientID,
		InvoiceNumber:   inv.InvoiceNumber,
		Status:          string(inv.Status),
		Currency:        inv.Currency,
		Subtotal:        inv.Subtotal,
		TaxAmount:       inv.TaxAmount,
		DiscountAmount:  inv.DiscountAmount,
		DiscountReason:  inv.DiscountReason,
		TotalAmount:     inv.TotalAmount,
		InsuranceAmount: inv.InsuranceAmount,
		PatientAmount:   inv.PatientAmount,
		PaidAmount:      inv.PaidAmount,
		BalanceDue:      inv.BalanceDue,
		Notes:           inv.Notes,
		NotesVi:         inv.NotesVi,
		IssuedAt:        inv.IssuedAt.Format(time.RFC3339),
		CreatedAt:       inv.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       inv.UpdatedAt.Format(time.RFC3339),
	}

	if inv.DueAt != nil {
		formatted := inv.DueAt.Format("2006-01-02")
		resp.DueAt = &formatted
	}

	if inv.PaidAt != nil {
		formatted := inv.PaidAt.Format(time.RFC3339)
		resp.PaidAt = &formatted
	}

	// Convert line items
	resp.Items = make([]InvoiceItemResponse, len(inv.Items))
	for i, item := range inv.Items {
		resp.Items[i] = InvoiceItemResponse{
			ID:            item.ID,
			ServiceCodeID: item.ServiceCodeID,
			Description:   item.Description,
			DescriptionVi: item.DescriptionVi,
			Quantity:      item.Quantity,
			UnitPrice:     item.UnitPrice,
			TotalPrice:    item.TotalPrice,
			BHYTCoverable: item.BHYTCoverable,
			BHYTAmount:    item.BHYTAmount,
			SortOrder:     item.SortOrder,
		}
	}

	// Convert payments
	resp.Payments = make([]PaymentResponse, len(inv.Payments))
	for i, p := range inv.Payments {
		resp.Payments[i] = toPaymentResponse(&p)
	}

	return resp
}

func toPaymentResponse(p *model.Payment) PaymentResponse {
	return PaymentResponse{
		ID:             p.ID,
		InvoiceID:      p.InvoiceID,
		ClinicID:       p.ClinicID,
		Amount:         p.Amount,
		Currency:       p.Currency,
		Method:         string(p.Method),
		Status:         string(p.Status),
		TransactionRef: p.TransactionRef,
		ReceiptNumber:  p.ReceiptNumber,
		Notes:          p.Notes,
		PaidAt:         p.PaidAt.Format(time.RFC3339),
		CreatedAt:      p.CreatedAt.Format(time.RFC3339),
	}
}

func toBillingCalculationResponse(calc *model.BillingCalculation) BillingCalculationResponse {
	lineItems := make([]BillingLineItemResponse, len(calc.LineItems))
	for i, li := range calc.LineItems {
		lineItems[i] = BillingLineItemResponse{
			Code:            li.Code,
			Name:            li.Name,
			NameVi:          li.NameVi,
			UnitPrice:       li.UnitPrice,
			Currency:        li.Currency,
			BHYTCoverable:   li.BHYTCoverable,
			InsuranceAmount: li.InsuranceAmount,
			PatientAmount:   li.PatientAmount,
		}
	}

	return BillingCalculationResponse{
		PatientID:       calc.PatientID,
		TotalAmount:     calc.TotalAmount,
		InsuranceAmount: calc.InsuranceAmount,
		CopayAmount:     calc.CopayAmount,
		CoveragePercent: calc.CoveragePercent,
		Currency:        calc.Currency,
		LineItems:       lineItems,
		CalculatedAt:    calc.CalculatedAt.Format(time.RFC3339),
	}
}
