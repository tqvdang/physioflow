package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// BHYTClaimHandler handles BHYT claim-related HTTP requests.
type BHYTClaimHandler struct {
	svc *service.Service
}

// NewBHYTClaimHandler creates a new BHYTClaimHandler.
func NewBHYTClaimHandler(svc *service.Service) *BHYTClaimHandler {
	return &BHYTClaimHandler{svc: svc}
}

// --- Response types ---

// BHYTClaimResponse represents a BHYT claim in API responses.
type BHYTClaimResponse struct {
	ID                   string                      `json:"id"`
	ClinicID             string                      `json:"clinic_id"`
	FacilityCode         string                      `json:"facility_code"`
	Month                int                         `json:"month"`
	Year                 int                         `json:"year"`
	FilePath             string                      `json:"file_path,omitempty"`
	FileName             string                      `json:"file_name,omitempty"`
	Status               string                      `json:"status"`
	TotalAmount          float64                     `json:"total_amount"`
	TotalInsuranceAmount float64                     `json:"total_insurance_amount"`
	TotalPatientAmount   float64                     `json:"total_patient_amount"`
	LineItemCount        int                         `json:"line_item_count"`
	RejectionReason      string                      `json:"rejection_reason,omitempty"`
	Notes                string                      `json:"notes,omitempty"`
	CreatedAt            string                      `json:"created_at"`
	UpdatedAt            string                      `json:"updated_at"`
	SubmittedAt          *string                     `json:"submitted_at,omitempty"`
	ApprovedAt           *string                     `json:"approved_at,omitempty"`
	RejectedAt           *string                     `json:"rejected_at,omitempty"`
	LineItems            []BHYTClaimLineItemResponse `json:"line_items,omitempty"`
}

// BHYTClaimLineItemResponse represents a BHYT claim line item in API responses.
type BHYTClaimLineItemResponse struct {
	ID             string  `json:"id"`
	ClaimID        string  `json:"claim_id"`
	InvoiceID      *string `json:"invoice_id,omitempty"`
	PatientID      string  `json:"patient_id"`
	PatientName    string  `json:"patient_name"`
	BHYTCardNumber string  `json:"bhyt_card_number"`
	ServiceCode    string  `json:"service_code"`
	ServiceNameVi  string  `json:"service_name_vi"`
	Quantity       int     `json:"quantity"`
	UnitPrice      float64 `json:"unit_price"`
	TotalPrice     float64 `json:"total_price"`
	InsurancePaid  float64 `json:"insurance_paid"`
	PatientPaid    float64 `json:"patient_paid"`
	ServiceDate    string  `json:"service_date"`
}

// BHYTClaimListResponseJSON represents a paginated claim list in API responses.
type BHYTClaimListResponseJSON struct {
	Data       []BHYTClaimResponse `json:"data"`
	Total      int64               `json:"total"`
	Page       int                 `json:"page"`
	PerPage    int                 `json:"per_page"`
	TotalPages int                 `json:"total_pages"`
}

// --- Handlers ---

// GenerateClaim generates a BHYT claim XML file for a given facility and period.
// @Summary Generate BHYT claim
// @Description Generates a BHYT claim XML file for VSS submission
// @Tags billing
// @Accept json
// @Produce json
// @Param body body model.GenerateClaimRequest true "Claim generation parameters"
// @Success 201 {object} BHYTClaimResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/billing/claims/generate [post]
func (h *BHYTClaimHandler) GenerateClaim(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.GenerateClaimRequest
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

	// Validate claim period is not in the future
	if err := service.ValidateClaimPeriod(req.Month, req.Year); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_period",
			Message: err.Error(),
		})
	}

	claim, err := h.svc.BHYTClaim().GenerateClaimFile(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		log.Error().Err(err).
			Str("facility_code", req.FacilityCode).
			Int("month", req.Month).
			Int("year", req.Year).
			Msg("failed to generate BHYT claim")

		// Check for specific errors
		if errors.Is(err, repository.ErrAlreadyExists) {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "claim_exists",
				Message: "A claim for this facility and period already exists",
			})
		}

		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "generation_failed",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, toBHYTClaimResponse(claim))
}

// GetClaim retrieves a BHYT claim by ID.
// @Summary Get BHYT claim
// @Description Retrieves a BHYT claim by ID with line items
// @Tags billing
// @Accept json
// @Produce json
// @Param id path string true "Claim ID"
// @Success 200 {object} BHYTClaimResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/billing/claims/{id} [get]
func (h *BHYTClaimHandler) GetClaim(c echo.Context) error {
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
			Message: "Claim ID is required",
		})
	}

	claim, err := h.svc.BHYTClaim().GetClaim(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Claim not found",
			})
		}
		log.Error().Err(err).Str("claim_id", id).Msg("failed to get BHYT claim")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve claim",
		})
	}

	return c.JSON(http.StatusOK, toBHYTClaimResponse(claim))
}

// ListClaims retrieves a paginated list of BHYT claims.
// @Summary List BHYT claims
// @Description Retrieves a paginated list of BHYT claims with optional filters
// @Tags billing
// @Accept json
// @Produce json
// @Param facility_code query string false "Filter by facility code"
// @Param status query string false "Filter by status"
// @Param year query int false "Filter by year"
// @Param month query int false "Filter by month"
// @Param page query int false "Page number"
// @Param per_page query int false "Items per page"
// @Success 200 {object} BHYTClaimListResponseJSON
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/billing/claims [get]
func (h *BHYTClaimHandler) ListClaims(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	params := model.NewBHYTClaimSearchParams()
	params.ClinicID = user.ClinicID

	if v := c.QueryParam("facility_code"); v != "" {
		params.FacilityCode = v
	}
	if v := c.QueryParam("status"); v != "" {
		params.Status = model.BHYTClaimStatus(v)
	}
	if v := c.QueryParam("year"); v != "" {
		if year, err := strconv.Atoi(v); err == nil {
			params.Year = year
		}
	}
	if v := c.QueryParam("month"); v != "" {
		if month, err := strconv.Atoi(v); err == nil {
			params.Month = month
		}
	}
	if v := c.QueryParam("page"); v != "" {
		if page, err := strconv.Atoi(v); err == nil && page > 0 {
			params.Page = page
		}
	}
	if v := c.QueryParam("per_page"); v != "" {
		if perPage, err := strconv.Atoi(v); err == nil && perPage > 0 {
			params.PerPage = perPage
		}
	}
	if v := c.QueryParam("sort_by"); v != "" {
		params.SortBy = v
	}
	if v := c.QueryParam("sort_order"); v != "" {
		params.SortOrder = v
	}

	result, err := h.svc.BHYTClaim().ListClaims(c.Request().Context(), params)
	if err != nil {
		log.Error().Err(err).Msg("failed to list BHYT claims")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to list claims",
		})
	}

	// Convert to response
	resp := BHYTClaimListResponseJSON{
		Data:       make([]BHYTClaimResponse, len(result.Data)),
		Total:      result.Total,
		Page:       result.Page,
		PerPage:    result.PerPage,
		TotalPages: result.TotalPages,
	}
	for i, claim := range result.Data {
		resp.Data[i] = toBHYTClaimResponse(&claim)
	}

	return c.JSON(http.StatusOK, resp)
}

// DownloadClaim downloads the BHYT claim XML file.
// @Summary Download BHYT claim XML
// @Description Downloads the generated BHYT claim XML file
// @Tags billing
// @Produce application/xml
// @Param id path string true "Claim ID"
// @Success 200 {string} string "XML content"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/billing/claims/{id}/download [get]
func (h *BHYTClaimHandler) DownloadClaim(c echo.Context) error {
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
			Message: "Claim ID is required",
		})
	}

	xmlBytes, fileName, err := h.svc.BHYTClaim().GetClaimXML(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Claim not found",
			})
		}
		log.Error().Err(err).Str("claim_id", id).Msg("failed to generate claim XML")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate claim XML",
		})
	}

	c.Response().Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	c.Response().Header().Set("Content-Type", "application/xml; charset=utf-8")
	return c.Blob(http.StatusOK, "application/xml", xmlBytes)
}

// --- Response converters ---

func toBHYTClaimResponse(claim *model.BHYTClaim) BHYTClaimResponse {
	resp := BHYTClaimResponse{
		ID:                   claim.ID,
		ClinicID:             claim.ClinicID,
		FacilityCode:         claim.FacilityCode,
		Month:                claim.Month,
		Year:                 claim.Year,
		FilePath:             claim.FilePath,
		FileName:             claim.FileName,
		Status:               string(claim.Status),
		TotalAmount:          claim.TotalAmount,
		TotalInsuranceAmount: claim.TotalInsuranceAmount,
		TotalPatientAmount:   claim.TotalPatientAmount,
		LineItemCount:        claim.LineItemCount,
		RejectionReason:      claim.RejectionReason,
		Notes:                claim.Notes,
		CreatedAt:            claim.CreatedAt.Format(time.RFC3339),
		UpdatedAt:            claim.UpdatedAt.Format(time.RFC3339),
	}

	if claim.SubmittedAt != nil {
		formatted := claim.SubmittedAt.Format(time.RFC3339)
		resp.SubmittedAt = &formatted
	}
	if claim.ApprovedAt != nil {
		formatted := claim.ApprovedAt.Format(time.RFC3339)
		resp.ApprovedAt = &formatted
	}
	if claim.RejectedAt != nil {
		formatted := claim.RejectedAt.Format(time.RFC3339)
		resp.RejectedAt = &formatted
	}

	// Convert line items
	resp.LineItems = make([]BHYTClaimLineItemResponse, len(claim.LineItems))
	for i, item := range claim.LineItems {
		resp.LineItems[i] = BHYTClaimLineItemResponse{
			ID:             item.ID,
			ClaimID:        item.ClaimID,
			InvoiceID:      item.InvoiceID,
			PatientID:      item.PatientID,
			PatientName:    item.PatientName,
			BHYTCardNumber: item.BHYTCardNumber,
			ServiceCode:    item.ServiceCode,
			ServiceNameVi:  item.ServiceNameVi,
			Quantity:       item.Quantity,
			UnitPrice:      item.UnitPrice,
			TotalPrice:     item.TotalPrice,
			InsurancePaid:  item.InsurancePaid,
			PatientPaid:    item.PatientPaid,
			ServiceDate:    item.ServiceDate.Format("2006-01-02"),
		}
	}

	return resp
}
