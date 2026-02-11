package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
)

// FinancialReportHandler handles financial reporting HTTP requests.
type FinancialReportHandler struct {
	svc *service.Service
}

// NewFinancialReportHandler creates a new FinancialReportHandler.
func NewFinancialReportHandler(svc *service.Service) *FinancialReportHandler {
	return &FinancialReportHandler{svc: svc}
}

// parseReportFilters extracts report filter parameters from the request.
func parseReportFilters(c echo.Context) model.ReportFilters {
	filters := model.ReportFilters{
		PeriodType:  c.QueryParam("period"),
		TherapistID: c.QueryParam("therapistId"),
		ServiceCode: c.QueryParam("serviceCode"),
		AgingBucket: c.QueryParam("agingBucket"),
		Format:      c.QueryParam("format"),
	}

	if v := c.QueryParam("startDate"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			filters.StartDate = &t
		}
	}
	if v := c.QueryParam("endDate"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			filters.EndDate = &t
		}
	}
	if v := c.QueryParam("limit"); v != "" {
		var limit int
		if _, err := parseIntParam(v, &limit); err == nil {
			filters.Limit = limit
		}
	}

	return filters
}

// parseIntParam is a small helper to parse an int from string.
func parseIntParam(s string, out *int) (bool, error) {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return false, nil
		}
		n = n*10 + int(ch-'0')
	}
	*out = n
	return true, nil
}

// RevenueReport generates a revenue-by-period report.
// @Summary Get revenue report
// @Description Returns revenue data aggregated by period (daily/weekly/monthly)
// @Tags financial-reports
// @Produce json
// @Param startDate query string false "Start date (YYYY-MM-DD)"
// @Param endDate query string false "End date (YYYY-MM-DD)"
// @Param period query string false "Period type (daily, weekly, monthly)" default(monthly)
// @Success 200 {object} model.RevenueByPeriodReport
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/revenue [get]
func (h *FinancialReportHandler) RevenueReport(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	filters := parseReportFilters(c)

	report, err := h.svc.FinancialReport().GenerateRevenueReport(c.Request().Context(), filters)
	if err != nil {
		log.Error().Err(err).Msg("failed to generate revenue report")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "report_generation_failed",
			Message: "Failed to generate revenue report",
		})
	}

	return c.JSON(http.StatusOK, report)
}

// OutstandingReport generates an outstanding payments aging report.
// @Summary Get outstanding payments report
// @Description Returns outstanding invoices with aging bucket classification
// @Tags financial-reports
// @Produce json
// @Param agingBucket query string false "Filter by aging bucket (0-30, 31-60, 61-90, 90+)"
// @Success 200 {object} model.OutstandingPaymentsReport
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/outstanding [get]
func (h *FinancialReportHandler) OutstandingReport(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	filters := parseReportFilters(c)

	report, err := h.svc.FinancialReport().GenerateAgingReport(c.Request().Context(), filters)
	if err != nil {
		log.Error().Err(err).Msg("failed to generate aging report")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "report_generation_failed",
			Message: "Failed to generate outstanding payments report",
		})
	}

	return c.JSON(http.StatusOK, report)
}

// TopServicesReport generates a top services by revenue report.
// @Summary Get top services report
// @Description Returns services ranked by total revenue
// @Tags financial-reports
// @Produce json
// @Param limit query int false "Number of top services" default(10)
// @Success 200 {object} model.ServiceRevenueReport
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/services/top [get]
func (h *FinancialReportHandler) TopServicesReport(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	filters := parseReportFilters(c)

	report, err := h.svc.FinancialReport().GenerateServiceReport(c.Request().Context(), filters)
	if err != nil {
		log.Error().Err(err).Msg("failed to generate service report")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "report_generation_failed",
			Message: "Failed to generate service revenue report",
		})
	}

	return c.JSON(http.StatusOK, report)
}

// ProductivityReport generates a therapist productivity report.
// @Summary Get therapist productivity report
// @Description Returns therapist session counts and revenue metrics
// @Tags financial-reports
// @Produce json
// @Param therapistId query string false "Filter by therapist ID"
// @Param startDate query string false "Start date (YYYY-MM-DD)"
// @Param endDate query string false "End date (YYYY-MM-DD)"
// @Success 200 {object} model.TherapistProductivityReport
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/productivity [get]
func (h *FinancialReportHandler) ProductivityReport(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	filters := parseReportFilters(c)

	report, err := h.svc.FinancialReport().GenerateProductivityReport(c.Request().Context(), filters)
	if err != nil {
		log.Error().Err(err).Msg("failed to generate productivity report")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "report_generation_failed",
			Message: "Failed to generate therapist productivity report",
		})
	}

	return c.JSON(http.StatusOK, report)
}

// ExportReport exports a report in the specified format (CSV).
// @Summary Export report as CSV
// @Description Downloads a report in CSV format
// @Tags financial-reports
// @Produce application/octet-stream
// @Param type path string true "Report type (revenue, outstanding, services, productivity)"
// @Param format query string false "Export format (csv)" default(csv)
// @Param startDate query string false "Start date (YYYY-MM-DD)"
// @Param endDate query string false "End date (YYYY-MM-DD)"
// @Param period query string false "Period type for revenue report"
// @Param limit query int false "Limit for top services report"
// @Param therapistId query string false "Therapist ID for productivity report"
// @Success 200 {file} file "CSV file"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/{type}/export [get]
func (h *FinancialReportHandler) ExportReport(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	reportType := c.Param("type")
	filters := parseReportFilters(c)

	var (
		data     []byte
		filename string
		err      error
	)

	ctx := c.Request().Context()
	svc := h.svc.FinancialReport()

	switch reportType {
	case "revenue":
		data, filename, err = svc.ExportRevenueCSV(ctx, filters)
	case "outstanding":
		data, filename, err = svc.ExportAgingCSV(ctx, filters)
	case "services":
		data, filename, err = svc.ExportServicesCSV(ctx, filters)
	case "productivity":
		data, filename, err = svc.ExportProductivityCSV(ctx, filters)
	default:
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_report_type",
			Message: "Valid report types: revenue, outstanding, services, productivity",
		})
	}

	if err != nil {
		log.Error().Err(err).Str("type", reportType).Msg("failed to export report")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "export_failed",
			Message: "Failed to export report",
		})
	}

	c.Response().Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Response().Header().Set("Content-Type", "text/csv; charset=utf-8")
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", data)
}

// RefreshViews triggers a refresh of all materialized views.
// @Summary Refresh materialized views
// @Description Triggers a refresh of all financial reporting materialized views
// @Tags financial-reports
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/reports/refresh [post]
func (h *FinancialReportHandler) RefreshViews(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	if err := h.svc.FinancialReport().RefreshViews(c.Request().Context()); err != nil {
		log.Error().Err(err).Msg("failed to refresh materialized views")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "refresh_failed",
			Message: "Failed to refresh materialized views",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message":      "Materialized views refreshed successfully",
		"refreshed_at": time.Now().Format(time.RFC3339),
	})
}
