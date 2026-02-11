package metrics

import (
	"sync"
	"sync/atomic"
	"time"
)

// Metrics holds Prometheus-style metrics for all PhysioFlow operations.
// Uses atomic counters for thread-safe operation without requiring
// the full Prometheus client library.
type Metrics struct {
	// BHYT Insurance metrics
	// bhyt_validations_total: counter with labels status, prefix_code
	bhytValidations sync.Map // key: "status:prefix_code" -> *uint64

	// bhyt_validation_errors_total: counter with labels error_type
	bhytValidationErrors sync.Map // key: error_type -> *uint64

	// bhyt_coverage_calculation_duration_seconds: histogram approximation
	bhytCoverageDurations   []time.Duration
	bhytCoverageDurationsMu sync.Mutex
	bhytCoverageCalculations uint64

	// Outcome Measures metrics
	// outcome_measures_recorded_total: counter with labels measure_type, phase
	outcomeMeasures sync.Map // key: "measure_type:phase" -> *uint64

	// outcome_progress_calculation_duration_seconds: histogram
	outcomeProgressDurations   []time.Duration
	outcomeProgressDurationsMu sync.Mutex
	outcomeProgressCalculations uint64

	// Billing metrics
	// billing_invoices_created_total: counter with labels status
	billingInvoices sync.Map // key: status -> *uint64

	// billing_payments_recorded_total: counter with labels payment_method
	billingPayments sync.Map // key: payment_method -> *uint64

	// billing_calculation_errors_total: counter
	billingCalculationErrors uint64

	// Protocol metrics
	// protocols_assigned_total: counter with labels protocol_id
	protocolsAssigned sync.Map // key: protocol_id -> *uint64

	// protocols_completed_total: counter
	protocolsCompleted uint64

	// Discharge metrics
	// discharge_summaries_generated_total: counter
	dischargeSummariesGenerated uint64

	// discharge_pdf_generation_duration_seconds: histogram
	dischargePDFDurations   []time.Duration
	dischargePDFDurationsMu sync.Mutex
	dischargePDFGenerations uint64

	// Medical Terms metrics
	// medical_terms_search_total: counter
	medicalTermsSearches uint64

	// medical_terms_search_duration_seconds: histogram
	medicalTermsSearchDurations   []time.Duration
	medicalTermsSearchDurationsMu sync.Mutex

	// API Request metrics
	// api_requests_total: counter with labels endpoint, method, status
	apiRequests sync.Map // key: "endpoint:method:status" -> *uint64

	// api_request_duration_seconds: histogram with labels endpoint, method
	apiRequestDurations   sync.Map // key: "endpoint:method" -> []time.Duration
	apiRequestDurationsMu sync.Map // key: "endpoint:method" -> *sync.Mutex
}

var (
	instance *Metrics
	once     sync.Once
)

// Get returns the singleton Metrics instance.
func Get() *Metrics {
	once.Do(func() {
		instance = &Metrics{
			bhytCoverageDurations:       make([]time.Duration, 0, 1024),
			outcomeProgressDurations:    make([]time.Duration, 0, 1024),
			dischargePDFDurations:       make([]time.Duration, 0, 1024),
			medicalTermsSearchDurations: make([]time.Duration, 0, 1024),
		}
	})
	return instance
}

// BHYT Insurance metrics

// RecordBHYTValidation increments the validation counter for the given status and prefix code.
func RecordBHYTValidation(status, prefixCode string) {
	m := Get()
	key := status + ":" + prefixCode
	val, _ := m.bhytValidations.LoadOrStore(key, new(uint64))
	atomic.AddUint64(val.(*uint64), 1)
}

// RecordValidationError increments the validation error counter for the given error type.
func RecordValidationError(errorType string) {
	m := Get()
	val, _ := m.bhytValidationErrors.LoadOrStore(errorType, new(uint64))
	atomic.AddUint64(val.(*uint64), 1)
}

// RecordCoverageCalculation records the duration of a coverage calculation.
func RecordCoverageCalculation(duration time.Duration) {
	m := Get()
	m.bhytCoverageDurationsMu.Lock()
	m.bhytCoverageDurations = append(m.bhytCoverageDurations, duration)
	m.bhytCoverageDurationsMu.Unlock()
	atomic.AddUint64(&m.bhytCoverageCalculations, 1)
}

// Outcome Measures metrics

// RecordOutcomeMeasure increments the outcome measure counter for the given measure type and phase.
func RecordOutcomeMeasure(measureType, phase string) {
	m := Get()
	key := measureType + ":" + phase
	val, _ := m.outcomeMeasures.LoadOrStore(key, new(uint64))
	atomic.AddUint64(val.(*uint64), 1)
}

// RecordOutcomeProgressCalculation records the duration of an outcome progress calculation.
func RecordOutcomeProgressCalculation(duration time.Duration) {
	m := Get()
	m.outcomeProgressDurationsMu.Lock()
	m.outcomeProgressDurations = append(m.outcomeProgressDurations, duration)
	m.outcomeProgressDurationsMu.Unlock()
	atomic.AddUint64(&m.outcomeProgressCalculations, 1)
}

// Billing metrics

// RecordBillingInvoice increments the invoice counter for the given status.
func RecordBillingInvoice(status string) {
	m := Get()
	val, _ := m.billingInvoices.LoadOrStore(status, new(uint64))
	atomic.AddUint64(val.(*uint64), 1)
}

// RecordBillingPayment increments the payment counter for the given payment method.
func RecordBillingPayment(paymentMethod string) {
	m := Get()
	val, _ := m.billingPayments.LoadOrStore(paymentMethod, new(uint64))
	atomic.AddUint64(val.(*uint64), 1)
}

// RecordBillingCalculationError increments the billing calculation error counter.
func RecordBillingCalculationError() {
	m := Get()
	atomic.AddUint64(&m.billingCalculationErrors, 1)
}

// Protocol metrics

// RecordProtocolAssignment increments the protocol assignment counter for the given protocol ID.
func RecordProtocolAssignment(protocolID string) {
	m := Get()
	val, _ := m.protocolsAssigned.LoadOrStore(protocolID, new(uint64))
	atomic.AddUint64(val.(*uint64), 1)
}

// RecordProtocolCompletion increments the protocol completion counter.
func RecordProtocolCompletion() {
	m := Get()
	atomic.AddUint64(&m.protocolsCompleted, 1)
}

// Discharge metrics

// RecordDischargeSummary increments the discharge summary generation counter.
func RecordDischargeSummary() {
	m := Get()
	atomic.AddUint64(&m.dischargeSummariesGenerated, 1)
}

// RecordDischargePDFGeneration records the duration of a discharge PDF generation.
func RecordDischargePDFGeneration(duration time.Duration) {
	m := Get()
	m.dischargePDFDurationsMu.Lock()
	m.dischargePDFDurations = append(m.dischargePDFDurations, duration)
	m.dischargePDFDurationsMu.Unlock()
	atomic.AddUint64(&m.dischargePDFGenerations, 1)
}

// Medical Terms metrics

// RecordMedicalTermsSearch increments the medical terms search counter and records duration.
func RecordMedicalTermsSearch(duration time.Duration) {
	m := Get()
	atomic.AddUint64(&m.medicalTermsSearches, 1)
	m.medicalTermsSearchDurationsMu.Lock()
	m.medicalTermsSearchDurations = append(m.medicalTermsSearchDurations, duration)
	m.medicalTermsSearchDurationsMu.Unlock()
}

// API Request metrics

// RecordAPIRequest increments the API request counter and records duration.
func RecordAPIRequest(endpoint, method string, status int, duration time.Duration) {
	m := Get()

	// Increment request counter
	key := endpoint + ":" + method + ":" + string(rune(status/100)) + "xx"
	val, _ := m.apiRequests.LoadOrStore(key, new(uint64))
	atomic.AddUint64(val.(*uint64), 1)

	// Record duration
	durationKey := endpoint + ":" + method
	durations, _ := m.apiRequestDurations.LoadOrStore(durationKey, make([]time.Duration, 0, 1024))
	mu, _ := m.apiRequestDurationsMu.LoadOrStore(durationKey, &sync.Mutex{})

	mu.(*sync.Mutex).Lock()
	m.apiRequestDurations.Store(durationKey, append(durations.([]time.Duration), duration))
	mu.(*sync.Mutex).Unlock()
}

// Snapshot represents a point-in-time view of all metrics.
type Snapshot struct {
	// BHYT Insurance
	BHYTValidations          map[string]uint64 `json:"bhyt_validations_total"`
	BHYTValidationErrors     map[string]uint64 `json:"bhyt_validation_errors_total"`
	BHYTCoverageCalculations uint64            `json:"bhyt_coverage_calculations_total"`
	BHYTCoverageAvgMs        float64           `json:"bhyt_coverage_avg_duration_ms"`
	BHYTCoverageP50Ms        float64           `json:"bhyt_coverage_p50_duration_ms"`
	BHYTCoverageP95Ms        float64           `json:"bhyt_coverage_p95_duration_ms"`
	BHYTCoverageP99Ms        float64           `json:"bhyt_coverage_p99_duration_ms"`

	// Outcome Measures
	OutcomeMeasuresRecorded          map[string]uint64 `json:"outcome_measures_recorded_total"`
	OutcomeProgressCalculations      uint64            `json:"outcome_progress_calculations_total"`
	OutcomeProgressAvgMs             float64           `json:"outcome_progress_avg_duration_ms"`
	OutcomeProgressP95Ms             float64           `json:"outcome_progress_p95_duration_ms"`

	// Billing
	BillingInvoices              map[string]uint64 `json:"billing_invoices_created_total"`
	BillingPayments              map[string]uint64 `json:"billing_payments_recorded_total"`
	BillingCalculationErrors     uint64            `json:"billing_calculation_errors_total"`

	// Protocols
	ProtocolsAssigned   map[string]uint64 `json:"protocols_assigned_total"`
	ProtocolsCompleted  uint64            `json:"protocols_completed_total"`

	// Discharge
	DischargeSummariesGenerated uint64  `json:"discharge_summaries_generated_total"`
	DischargePDFGenerations     uint64  `json:"discharge_pdf_generations_total"`
	DischargePDFAvgMs           float64 `json:"discharge_pdf_avg_duration_ms"`
	DischargePDFP95Ms           float64 `json:"discharge_pdf_p95_duration_ms"`

	// Medical Terms
	MedicalTermsSearches   uint64  `json:"medical_terms_search_total"`
	MedicalTermsAvgMs      float64 `json:"medical_terms_search_avg_duration_ms"`
	MedicalTermsP95Ms      float64 `json:"medical_terms_search_p95_duration_ms"`

	// API Requests
	APIRequests         map[string]uint64            `json:"api_requests_total"`
	APIRequestDurations map[string]DurationPercentiles `json:"api_request_durations"`
}

// DurationPercentiles represents percentile durations.
type DurationPercentiles struct {
	AvgMs float64 `json:"avg_ms"`
	P50Ms float64 `json:"p50_ms"`
	P95Ms float64 `json:"p95_ms"`
	P99Ms float64 `json:"p99_ms"`
}

// GetSnapshot returns a point-in-time snapshot of all metrics.
func GetSnapshot() Snapshot {
	m := Get()

	// BHYT validations
	bhytValidations := make(map[string]uint64)
	m.bhytValidations.Range(func(key, value any) bool {
		bhytValidations[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	// BHYT validation errors
	bhytErrors := make(map[string]uint64)
	m.bhytValidationErrors.Range(func(key, value any) bool {
		bhytErrors[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	// BHYT coverage durations
	bhytCoverageTotal := atomic.LoadUint64(&m.bhytCoverageCalculations)
	var bhytAvgMs, bhytP50Ms, bhytP95Ms, bhytP99Ms float64
	if bhytCoverageTotal > 0 {
		m.bhytCoverageDurationsMu.Lock()
		bhytAvgMs, bhytP50Ms, bhytP95Ms, bhytP99Ms = calculatePercentiles(m.bhytCoverageDurations)
		m.bhytCoverageDurationsMu.Unlock()
	}

	// Outcome measures
	outcomeMeasures := make(map[string]uint64)
	m.outcomeMeasures.Range(func(key, value any) bool {
		outcomeMeasures[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	// Outcome progress durations
	outcomeProgressTotal := atomic.LoadUint64(&m.outcomeProgressCalculations)
	var outcomeAvgMs, _, outcomeP95Ms, _ float64
	if outcomeProgressTotal > 0 {
		m.outcomeProgressDurationsMu.Lock()
		outcomeAvgMs, _, outcomeP95Ms, _ = calculatePercentiles(m.outcomeProgressDurations)
		m.outcomeProgressDurationsMu.Unlock()
	}

	// Billing invoices
	billingInvoices := make(map[string]uint64)
	m.billingInvoices.Range(func(key, value any) bool {
		billingInvoices[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	// Billing payments
	billingPayments := make(map[string]uint64)
	m.billingPayments.Range(func(key, value any) bool {
		billingPayments[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	// Protocols assigned
	protocolsAssigned := make(map[string]uint64)
	m.protocolsAssigned.Range(func(key, value any) bool {
		protocolsAssigned[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	// Discharge PDF durations
	dischargePDFTotal := atomic.LoadUint64(&m.dischargePDFGenerations)
	var dischargeAvgMs, _, dischargeP95Ms, _ float64
	if dischargePDFTotal > 0 {
		m.dischargePDFDurationsMu.Lock()
		dischargeAvgMs, _, dischargeP95Ms, _ = calculatePercentiles(m.dischargePDFDurations)
		m.dischargePDFDurationsMu.Unlock()
	}

	// Medical terms search durations
	medicalTermsTotal := atomic.LoadUint64(&m.medicalTermsSearches)
	var medicalTermsAvgMs, _, medicalTermsP95Ms, _ float64
	if medicalTermsTotal > 0 {
		m.medicalTermsSearchDurationsMu.Lock()
		medicalTermsAvgMs, _, medicalTermsP95Ms, _ = calculatePercentiles(m.medicalTermsSearchDurations)
		m.medicalTermsSearchDurationsMu.Unlock()
	}

	// API requests
	apiRequests := make(map[string]uint64)
	m.apiRequests.Range(func(key, value any) bool {
		apiRequests[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	// API request durations
	apiDurations := make(map[string]DurationPercentiles)
	m.apiRequestDurations.Range(func(key, value any) bool {
		durations := value.([]time.Duration)
		if len(durations) > 0 {
			avgMs, p50Ms, p95Ms, p99Ms := calculatePercentiles(durations)
			apiDurations[key.(string)] = DurationPercentiles{
				AvgMs: avgMs,
				P50Ms: p50Ms,
				P95Ms: p95Ms,
				P99Ms: p99Ms,
			}
		}
		return true
	})

	return Snapshot{
		BHYTValidations:                  bhytValidations,
		BHYTValidationErrors:             bhytErrors,
		BHYTCoverageCalculations:         bhytCoverageTotal,
		BHYTCoverageAvgMs:                bhytAvgMs,
		BHYTCoverageP50Ms:                bhytP50Ms,
		BHYTCoverageP95Ms:                bhytP95Ms,
		BHYTCoverageP99Ms:                bhytP99Ms,
		OutcomeMeasuresRecorded:          outcomeMeasures,
		OutcomeProgressCalculations:      outcomeProgressTotal,
		OutcomeProgressAvgMs:             outcomeAvgMs,
		OutcomeProgressP95Ms:             outcomeP95Ms,
		BillingInvoices:                  billingInvoices,
		BillingPayments:                  billingPayments,
		BillingCalculationErrors:         atomic.LoadUint64(&m.billingCalculationErrors),
		ProtocolsAssigned:                protocolsAssigned,
		ProtocolsCompleted:               atomic.LoadUint64(&m.protocolsCompleted),
		DischargeSummariesGenerated:      atomic.LoadUint64(&m.dischargeSummariesGenerated),
		DischargePDFGenerations:          dischargePDFTotal,
		DischargePDFAvgMs:                dischargeAvgMs,
		DischargePDFP95Ms:                dischargeP95Ms,
		MedicalTermsSearches:             medicalTermsTotal,
		MedicalTermsAvgMs:                medicalTermsAvgMs,
		MedicalTermsP95Ms:                medicalTermsP95Ms,
		APIRequests:                      apiRequests,
		APIRequestDurations:              apiDurations,
	}
}

// calculatePercentiles calculates average, p50, p95, and p99 from durations.
func calculatePercentiles(durations []time.Duration) (avg, p50, p95, p99 float64) {
	if len(durations) == 0 {
		return 0, 0, 0, 0
	}

	// Calculate average
	var sum time.Duration
	for _, d := range durations {
		sum += d
	}
	avg = float64(sum.Milliseconds()) / float64(len(durations))

	// Calculate percentiles (simple approximation without sorting)
	// For production, consider using a proper percentile library
	count := len(durations)
	p50Idx := count / 2
	p95Idx := count * 95 / 100
	p99Idx := count * 99 / 100

	if p50Idx < count {
		p50 = float64(durations[p50Idx].Milliseconds())
	}
	if p95Idx < count {
		p95 = float64(durations[p95Idx].Milliseconds())
	}
	if p99Idx < count {
		p99 = float64(durations[p99Idx].Milliseconds())
	}

	return avg, p50, p95, p99
}
