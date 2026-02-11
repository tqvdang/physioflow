package handler

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
)

// ReportHandler handles report generation HTTP requests.
type ReportHandler struct {
	svc *service.Service
}

// NewReportHandler creates a new ReportHandler.
func NewReportHandler(svc *service.Service) *ReportHandler {
	return &ReportHandler{svc: svc}
}

// DischargeSummaryPDF generates and downloads a discharge summary as PDF.
// @Summary Download discharge summary PDF
// @Description Generates a PDF of the discharge summary with bilingual support
// @Tags reports
// @Produce application/pdf
// @Param id path string true "Discharge Summary ID"
// @Param locale query string false "Locale (vi or en, default: vi)"
// @Success 200 {file} file "PDF document"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/discharge/{id}/pdf [get]
func (h *ReportHandler) DischargeSummaryPDF(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	summaryID := c.Param("id")
	if summaryID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Discharge summary ID is required",
		})
	}

	locale := c.QueryParam("locale")
	if locale == "" {
		locale = "vi"
	}
	if locale != "vi" && locale != "en" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid locale. Use 'vi' or 'en'.",
		})
	}

	pdfBytes, filename, err := h.svc.Report().GenerateDischargeSummaryPDF(
		c.Request().Context(),
		summaryID,
		locale,
		user.UserID,
	)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Discharge summary not found",
			})
		}
		log.Error().Err(err).
			Str("summary_id", summaryID).
			Str("locale", locale).
			Msg("failed to generate discharge summary PDF")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "pdf_generation_failed",
			Message: "Failed to generate discharge summary PDF. Ensure wkhtmltopdf is installed.",
		})
	}

	c.Response().Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Response().Header().Set("Content-Type", "application/pdf")
	return c.Blob(http.StatusOK, "application/pdf", pdfBytes)
}

// InvoicePDF generates and downloads an invoice as PDF.
// @Summary Download invoice PDF
// @Description Generates a PDF of the invoice with bilingual support and VND formatting
// @Tags reports
// @Produce application/pdf
// @Param id path string true "Invoice ID"
// @Param locale query string false "Locale (vi or en, default: vi)"
// @Success 200 {file} file "PDF document"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/invoice/{id}/pdf [get]
func (h *ReportHandler) InvoicePDF(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	invoiceID := c.Param("id")
	if invoiceID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Invoice ID is required",
		})
	}

	locale := c.QueryParam("locale")
	if locale == "" {
		locale = "vi"
	}
	if locale != "vi" && locale != "en" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid locale. Use 'vi' or 'en'.",
		})
	}

	pdfBytes, filename, err := h.svc.Report().GenerateInvoicePDF(
		c.Request().Context(),
		invoiceID,
		locale,
		user.UserID,
	)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Invoice not found",
			})
		}
		log.Error().Err(err).
			Str("invoice_id", invoiceID).
			Str("locale", locale).
			Msg("failed to generate invoice PDF")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "pdf_generation_failed",
			Message: "Failed to generate invoice PDF. Ensure wkhtmltopdf is installed.",
		})
	}

	c.Response().Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Response().Header().Set("Content-Type", "application/pdf")
	return c.Blob(http.StatusOK, "application/pdf", pdfBytes)
}
