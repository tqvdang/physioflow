package metrics

import (
	"fmt"
	"strings"
	"sync"
)

// PrometheusExporter converts metrics to Prometheus text format.
type PrometheusExporter struct {
	mu sync.Mutex
}

// NewPrometheusExporter creates a new Prometheus exporter.
func NewPrometheusExporter() *PrometheusExporter {
	return &PrometheusExporter{}
}

// Export generates Prometheus text format metrics.
func (e *PrometheusExporter) Export() string {
	e.mu.Lock()
	defer e.mu.Unlock()

	snapshot := GetSnapshot()
	var sb strings.Builder

	// BHYT validations
	sb.WriteString("# HELP bhyt_validations_total Total number of BHYT validations\n")
	sb.WriteString("# TYPE bhyt_validations_total counter\n")
	for key, value := range snapshot.BHYTValidations {
		parts := strings.Split(key, ":")
		if len(parts) == 2 {
			sb.WriteString(fmt.Sprintf("bhyt_validations_total{status=\"%s\",prefix_code=\"%s\"} %d\n", parts[0], parts[1], value))
		}
	}

	// BHYT validation errors
	sb.WriteString("# HELP bhyt_validation_errors_total Total number of BHYT validation errors\n")
	sb.WriteString("# TYPE bhyt_validation_errors_total counter\n")
	for errorType, value := range snapshot.BHYTValidationErrors {
		sb.WriteString(fmt.Sprintf("bhyt_validation_errors_total{error_type=\"%s\"} %d\n", errorType, value))
	}

	// BHYT coverage calculations
	sb.WriteString("# HELP bhyt_coverage_calculations_total Total number of BHYT coverage calculations\n")
	sb.WriteString("# TYPE bhyt_coverage_calculations_total counter\n")
	sb.WriteString(fmt.Sprintf("bhyt_coverage_calculations_total %d\n", snapshot.BHYTCoverageCalculations))

	// BHYT coverage duration metrics
	sb.WriteString("# HELP bhyt_coverage_avg_duration_ms Average BHYT coverage calculation duration in milliseconds\n")
	sb.WriteString("# TYPE bhyt_coverage_avg_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("bhyt_coverage_avg_duration_ms %.2f\n", snapshot.BHYTCoverageAvgMs))

	sb.WriteString("# HELP bhyt_coverage_p50_duration_ms BHYT coverage calculation p50 duration in milliseconds\n")
	sb.WriteString("# TYPE bhyt_coverage_p50_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("bhyt_coverage_p50_duration_ms %.2f\n", snapshot.BHYTCoverageP50Ms))

	sb.WriteString("# HELP bhyt_coverage_p95_duration_ms BHYT coverage calculation p95 duration in milliseconds\n")
	sb.WriteString("# TYPE bhyt_coverage_p95_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("bhyt_coverage_p95_duration_ms %.2f\n", snapshot.BHYTCoverageP95Ms))

	sb.WriteString("# HELP bhyt_coverage_p99_duration_ms BHYT coverage calculation p99 duration in milliseconds\n")
	sb.WriteString("# TYPE bhyt_coverage_p99_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("bhyt_coverage_p99_duration_ms %.2f\n", snapshot.BHYTCoverageP99Ms))

	// Outcome measures
	sb.WriteString("# HELP outcome_measures_recorded_total Total number of outcome measures recorded\n")
	sb.WriteString("# TYPE outcome_measures_recorded_total counter\n")
	for key, value := range snapshot.OutcomeMeasuresRecorded {
		parts := strings.Split(key, ":")
		if len(parts) == 2 {
			sb.WriteString(fmt.Sprintf("outcome_measures_recorded_total{measure_type=\"%s\",phase=\"%s\"} %d\n", parts[0], parts[1], value))
		}
	}

	// Outcome progress calculations
	sb.WriteString("# HELP outcome_progress_calculations_total Total number of outcome progress calculations\n")
	sb.WriteString("# TYPE outcome_progress_calculations_total counter\n")
	sb.WriteString(fmt.Sprintf("outcome_progress_calculations_total %d\n", snapshot.OutcomeProgressCalculations))

	sb.WriteString("# HELP outcome_progress_avg_duration_ms Average outcome progress calculation duration in milliseconds\n")
	sb.WriteString("# TYPE outcome_progress_avg_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("outcome_progress_avg_duration_ms %.2f\n", snapshot.OutcomeProgressAvgMs))

	sb.WriteString("# HELP outcome_progress_p95_duration_ms Outcome progress calculation p95 duration in milliseconds\n")
	sb.WriteString("# TYPE outcome_progress_p95_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("outcome_progress_p95_duration_ms %.2f\n", snapshot.OutcomeProgressP95Ms))

	// Billing invoices
	sb.WriteString("# HELP billing_invoices_created_total Total number of billing invoices created\n")
	sb.WriteString("# TYPE billing_invoices_created_total counter\n")
	for status, value := range snapshot.BillingInvoices {
		sb.WriteString(fmt.Sprintf("billing_invoices_created_total{status=\"%s\"} %d\n", status, value))
	}

	// Billing payments
	sb.WriteString("# HELP billing_payments_recorded_total Total number of billing payments recorded\n")
	sb.WriteString("# TYPE billing_payments_recorded_total counter\n")
	for method, value := range snapshot.BillingPayments {
		sb.WriteString(fmt.Sprintf("billing_payments_recorded_total{payment_method=\"%s\"} %d\n", method, value))
	}

	// Billing calculation errors
	sb.WriteString("# HELP billing_calculation_errors_total Total number of billing calculation errors\n")
	sb.WriteString("# TYPE billing_calculation_errors_total counter\n")
	sb.WriteString(fmt.Sprintf("billing_calculation_errors_total %d\n", snapshot.BillingCalculationErrors))

	// Protocols assigned
	sb.WriteString("# HELP protocols_assigned_total Total number of protocols assigned\n")
	sb.WriteString("# TYPE protocols_assigned_total counter\n")
	for protocolID, value := range snapshot.ProtocolsAssigned {
		sb.WriteString(fmt.Sprintf("protocols_assigned_total{protocol_id=\"%s\"} %d\n", protocolID, value))
	}

	// Protocols completed
	sb.WriteString("# HELP protocols_completed_total Total number of protocols completed\n")
	sb.WriteString("# TYPE protocols_completed_total counter\n")
	sb.WriteString(fmt.Sprintf("protocols_completed_total %d\n", snapshot.ProtocolsCompleted))

	// Discharge summaries
	sb.WriteString("# HELP discharge_summaries_generated_total Total number of discharge summaries generated\n")
	sb.WriteString("# TYPE discharge_summaries_generated_total counter\n")
	sb.WriteString(fmt.Sprintf("discharge_summaries_generated_total %d\n", snapshot.DischargeSummariesGenerated))

	// Discharge PDF generations
	sb.WriteString("# HELP discharge_pdf_generations_total Total number of discharge PDF generations\n")
	sb.WriteString("# TYPE discharge_pdf_generations_total counter\n")
	sb.WriteString(fmt.Sprintf("discharge_pdf_generations_total %d\n", snapshot.DischargePDFGenerations))

	sb.WriteString("# HELP discharge_pdf_avg_duration_ms Average discharge PDF generation duration in milliseconds\n")
	sb.WriteString("# TYPE discharge_pdf_avg_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("discharge_pdf_avg_duration_ms %.2f\n", snapshot.DischargePDFAvgMs))

	sb.WriteString("# HELP discharge_pdf_p95_duration_ms Discharge PDF generation p95 duration in milliseconds\n")
	sb.WriteString("# TYPE discharge_pdf_p95_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("discharge_pdf_p95_duration_ms %.2f\n", snapshot.DischargePDFP95Ms))

	// Medical terms searches
	sb.WriteString("# HELP medical_terms_search_total Total number of medical terms searches\n")
	sb.WriteString("# TYPE medical_terms_search_total counter\n")
	sb.WriteString(fmt.Sprintf("medical_terms_search_total %d\n", snapshot.MedicalTermsSearches))

	sb.WriteString("# HELP medical_terms_search_avg_duration_ms Average medical terms search duration in milliseconds\n")
	sb.WriteString("# TYPE medical_terms_search_avg_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("medical_terms_search_avg_duration_ms %.2f\n", snapshot.MedicalTermsAvgMs))

	sb.WriteString("# HELP medical_terms_search_p95_duration_ms Medical terms search p95 duration in milliseconds\n")
	sb.WriteString("# TYPE medical_terms_search_p95_duration_ms gauge\n")
	sb.WriteString(fmt.Sprintf("medical_terms_search_p95_duration_ms %.2f\n", snapshot.MedicalTermsP95Ms))

	// API requests
	sb.WriteString("# HELP api_requests_total Total number of API requests\n")
	sb.WriteString("# TYPE api_requests_total counter\n")
	for key, value := range snapshot.APIRequests {
		parts := strings.Split(key, ":")
		if len(parts) == 3 {
			sb.WriteString(fmt.Sprintf("api_requests_total{endpoint=\"%s\",method=\"%s\",status=\"%s\"} %d\n", parts[0], parts[1], parts[2], value))
		}
	}

	// API request durations
	for key, percentiles := range snapshot.APIRequestDurations {
		parts := strings.Split(key, ":")
		if len(parts) == 2 {
			endpoint, method := parts[0], parts[1]

			sb.WriteString(fmt.Sprintf("# HELP api_request_duration_avg_ms Average API request duration for %s %s\n", method, endpoint))
			sb.WriteString("# TYPE api_request_duration_avg_ms gauge\n")
			sb.WriteString(fmt.Sprintf("api_request_duration_avg_ms{endpoint=\"%s\",method=\"%s\"} %.2f\n", endpoint, method, percentiles.AvgMs))

			sb.WriteString(fmt.Sprintf("# HELP api_request_duration_p50_ms API request p50 duration for %s %s\n", method, endpoint))
			sb.WriteString("# TYPE api_request_duration_p50_ms gauge\n")
			sb.WriteString(fmt.Sprintf("api_request_duration_p50_ms{endpoint=\"%s\",method=\"%s\"} %.2f\n", endpoint, method, percentiles.P50Ms))

			sb.WriteString(fmt.Sprintf("# HELP api_request_duration_p95_ms API request p95 duration for %s %s\n", method, endpoint))
			sb.WriteString("# TYPE api_request_duration_p95_ms gauge\n")
			sb.WriteString(fmt.Sprintf("api_request_duration_p95_ms{endpoint=\"%s\",method=\"%s\"} %.2f\n", endpoint, method, percentiles.P95Ms))

			sb.WriteString(fmt.Sprintf("# HELP api_request_duration_p99_ms API request p99 duration for %s %s\n", method, endpoint))
			sb.WriteString("# TYPE api_request_duration_p99_ms gauge\n")
			sb.WriteString(fmt.Sprintf("api_request_duration_p99_ms{endpoint=\"%s\",method=\"%s\"} %.2f\n", endpoint, method, percentiles.P99Ms))
		}
	}

	return sb.String()
}
