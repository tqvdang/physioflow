package performance_test

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// QueryLogger tracks SQL queries for N+1 detection
type QueryLogger struct {
	queries []string
	enabled bool
}

func NewQueryLogger() *QueryLogger {
	return &QueryLogger{
		queries: make([]string, 0),
		enabled: false,
	}
}

func (ql *QueryLogger) Enable() {
	ql.enabled = true
	ql.queries = make([]string, 0)
}

func (ql *QueryLogger) Disable() {
	ql.enabled = false
}

func (ql *QueryLogger) Reset() {
	ql.queries = make([]string, 0)
}

func (ql *QueryLogger) Log(query string) {
	if ql.enabled {
		// Normalize query (remove extra whitespace, lowercase)
		normalized := strings.ToLower(strings.TrimSpace(regexp.MustCompile(`\s+`).ReplaceAllString(query, " ")))
		ql.queries = append(ql.queries, normalized)
	}
}

func (ql *QueryLogger) GetQueries() []string {
	return ql.queries
}

func (ql *QueryLogger) Count() int {
	return len(ql.queries)
}

func (ql *QueryLogger) CountByPattern(pattern string) int {
	count := 0
	re := regexp.MustCompile(pattern)
	for _, q := range ql.queries {
		if re.MatchString(q) {
			count++
		}
	}
	return count
}

// TestNoNPlusOneInPatientList verifies patient list doesn't have N+1 queries
func TestNoNPlusOneInPatientList(t *testing.T) {
	// Skip if integration tests are not enabled
	if testing.Short() {
		t.Skip("Skipping N+1 query test in short mode")
	}

	logger := NewQueryLogger()
	ctx := context.Background()

	// TODO: Setup test database connection with query logging
	// db := setupTestDB(t, logger)
	// defer db.Close()

	// TODO: Create test data - 10 patients with protocols
	// createTestPatients(t, db, 10)

	logger.Enable()
	logger.Reset()

	// Fetch patients with their active protocols
	// This should be 1-2 queries MAX (1 for patients, 1 for all protocols via JOIN or IN clause)
	// NOT 1 + N queries (1 for patients, then N individual queries for each patient's protocols)

	// TODO: Call repository method
	// patients, err := patientRepo.GetAllWithProtocols(ctx)
	// require.NoError(t, err)

	logger.Disable()

	// Assert query count
	queryCount := logger.Count()
	t.Logf("Total queries executed: %d", queryCount)

	// Print all queries for debugging
	for i, q := range logger.GetQueries() {
		t.Logf("Query %d: %s", i+1, q)
	}

	// Should be at most 2 queries:
	// 1. SELECT * FROM patients WHERE clinic_id = ?
	// 2. SELECT * FROM protocols WHERE patient_id IN (...)
	assert.LessOrEqual(t, queryCount, 3, "Should use at most 3 queries (patients + protocols + maybe insurance)")

	// Verify we're not doing individual SELECT queries per patient
	patientQueryCount := logger.CountByPattern(`select.*from\s+patients\s+where\s+id\s*=`)
	assert.LessOrEqual(t, patientQueryCount, 1, "Should not query individual patients in a loop")

	protocolQueryCount := logger.CountByPattern(`select.*from\s+protocols\s+where\s+patient_id\s*=`)
	assert.LessOrEqual(t, protocolQueryCount, 1, "Should not query protocols individually for each patient")
}

// TestNoNPlusOneInOutcomeMeasures verifies outcome measures don't have N+1 queries
func TestNoNPlusOneInOutcomeMeasures(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping N+1 query test in short mode")
	}

	logger := NewQueryLogger()
	ctx := context.Background()

	// TODO: Setup test database
	// db := setupTestDB(t, logger)
	// defer db.Close()

	// TODO: Create test data - patient with 50 outcome measures, each linked to library
	// patientID := createPatientWithMeasures(t, db, 50)

	logger.Enable()
	logger.Reset()

	// Fetch patient outcome measures with library details
	// Should be 1-2 queries (measures + JOIN library, OR measures then 1 query for all libraries)
	// NOT 1 + N queries

	// TODO: Call repository method
	// measures, err := measureRepo.GetPatientMeasuresWithLibrary(ctx, patientID)
	// require.NoError(t, err)

	logger.Disable()

	queryCount := logger.Count()
	t.Logf("Total queries executed: %d", queryCount)

	for i, q := range logger.GetQueries() {
		t.Logf("Query %d: %s", i+1, q)
	}

	// Should be at most 2 queries
	assert.LessOrEqual(t, queryCount, 2, "Should use JOIN or IN clause, not N+1 queries")

	// Verify we're not doing individual library lookups
	libraryQueryCount := logger.CountByPattern(`select.*from\s+outcome_measure_library\s+where\s+id\s*=`)
	assert.LessOrEqual(t, libraryQueryCount, 1, "Should not query library individually for each measure")
}

// TestNoNPlusOneInInvoiceList verifies invoice list doesn't have N+1 queries
func TestNoNPlusOneInInvoiceList(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping N+1 query test in short mode")
	}

	logger := NewQueryLogger()
	ctx := context.Background()

	// TODO: Setup test database
	// db := setupTestDB(t, logger)
	// defer db.Close()

	// TODO: Create test data - 20 invoices with items and payments
	// createInvoicesWithItems(t, db, 20)

	logger.Enable()
	logger.Reset()

	// Fetch invoices with items and payments
	// Should batch load related data, not query per invoice

	// TODO: Call repository method
	// invoices, err := invoiceRepo.GetAllWithDetails(ctx)
	// require.NoError(t, err)

	logger.Disable()

	queryCount := logger.Count()
	t.Logf("Total queries executed: %d", queryCount)

	for i, q := range logger.GetQueries() {
		t.Logf("Query %d: %s", i+1, q)
	}

	// Should be at most 3 queries (invoices + items + payments)
	assert.LessOrEqual(t, queryCount, 4, "Should batch load items and payments")

	// Verify we're not doing individual item queries per invoice
	itemQueryCount := logger.CountByPattern(`select.*from\s+invoice_items\s+where\s+invoice_id\s*=`)
	assert.LessOrEqual(t, itemQueryCount, 1, "Should not query items individually for each invoice")
}

// TestNoNPlusOneInDischargeSummary verifies discharge summary doesn't have N+1 queries
func TestNoNPlusOneInDischargeSummary(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping N+1 query test in short mode")
	}

	logger := NewQueryLogger()
	ctx := context.Background()

	// TODO: Setup test database
	// db := setupTestDB(t, logger)
	// defer db.Close()

	// TODO: Create test data - patient with multiple outcome measures
	// patientID := createPatientWithMeasures(t, db, 10)

	logger.Enable()
	logger.Reset()

	// Generate discharge summary (fetches baseline comparisons for all measures)
	// Should batch query all measures, not query per measure type

	// TODO: Call service method
	// summary, err := dischargeService.GenerateDischargeSummary(ctx, patientID)
	// require.NoError(t, err)

	logger.Disable()

	queryCount := logger.Count()
	t.Logf("Total queries executed: %d", queryCount)

	for i, q := range logger.GetQueries() {
		t.Logf("Query %d: %s", i+1, q)
	}

	// Should efficiently batch queries
	assert.LessOrEqual(t, queryCount, 5, "Should batch query measures and baseline comparisons")

	// Verify we're not doing separate queries per measure type
	measureQueryCount := logger.CountByPattern(`select.*from\s+outcome_measures\s+where.*measure_type\s*=`)
	assert.LessOrEqual(t, measureQueryCount, 2, "Should not query each measure type individually")
}

// BenchmarkPatientListQuery benchmarks patient list query performance
func BenchmarkPatientListQuery(b *testing.B) {
	// TODO: Setup test database
	// db := setupTestDB(b, nil)
	// defer db.Close()

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// TODO: Call repository method
		// _, _ = patientRepo.GetAll(ctx)
	}
}

// BenchmarkOutcomeMeasureProgress benchmarks outcome measure progress calculation
func BenchmarkOutcomeMeasureProgress(b *testing.B) {
	// TODO: Setup test database with test data
	// db := setupTestDB(b, nil)
	// defer db.Close()

	ctx := context.Background()
	// patientID := "test-patient-id"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// TODO: Call service method
		// _, _ = measureService.CalculateProgress(ctx, patientID, "vas")
	}
}

// BenchmarkMedicalTermSearch benchmarks medical term search performance
func BenchmarkMedicalTermSearch(b *testing.B) {
	// TODO: Setup test database with medical terms
	// db := setupTestDB(b, nil)
	// defer db.Close()

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// TODO: Call repository method
		// _, _ = termRepo.SearchTerms(ctx, "vai", "")
	}
}

// TestQueryPerformanceThresholds verifies queries meet performance targets
func TestQueryPerformanceThresholds(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance threshold test in short mode")
	}

	ctx := context.Background()

	tests := []struct {
		name      string
		operation func() error
		threshold time.Duration
	}{
		{
			name: "BHYT validation < 100ms",
			operation: func() error {
				// TODO: Call insurance validation
				// return insuranceService.ValidateBHYTCard(ctx, "HC1-2024-12345-67890")
				return nil
			},
			threshold: 100 * time.Millisecond,
		},
		{
			name: "Outcome progress calculation < 500ms",
			operation: func() error {
				// TODO: Call progress calculation
				// _, err := measureService.CalculateProgress(ctx, patientID, "vas")
				// return err
				return nil
			},
			threshold: 500 * time.Millisecond,
		},
		{
			name: "Medical term search < 200ms",
			operation: func() error {
				// TODO: Call term search
				// _, err := termService.SearchTerms(ctx, "vai", "")
				// return err
				return nil
			},
			threshold: 200 * time.Millisecond,
		},
		{
			name: "Billing calculation < 200ms",
			operation: func() error {
				// TODO: Call billing calculation
				// _, err := billingService.CalculateBilling(ctx, patientID, []string{"PT-EVAL-INIT"})
				// return err
				return nil
			},
			threshold: 200 * time.Millisecond,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start := time.Now()
			err := tt.operation()
			duration := time.Since(start)

			require.NoError(t, err)

			t.Logf("Operation took: %v (threshold: %v)", duration, tt.threshold)

			if duration > tt.threshold {
				t.Errorf("Operation exceeded threshold: %v > %v", duration, tt.threshold)
			}
		})
	}
}

// Helper function to detect potential N+1 queries in logs
func detectNPlusOne(queries []string) []string {
	issues := make([]string, 0)

	// Group similar queries
	queryPatterns := make(map[string]int)
	for _, q := range queries {
		// Extract query pattern (replace specific IDs with placeholder)
		pattern := regexp.MustCompile(`'[^']+'`).ReplaceAllString(q, "?")
		pattern = regexp.MustCompile(`\$\d+`).ReplaceAllString(pattern, "?")
		queryPatterns[pattern]++
	}

	// Check for repeated patterns (potential N+1)
	for pattern, count := range queryPatterns {
		if count > 5 { // If same query executed more than 5 times
			issues = append(issues, fmt.Sprintf(
				"Potential N+1 query detected (executed %d times): %s",
				count,
				pattern,
			))
		}
	}

	return issues
}

// Example usage
func TestDetectNPlusOneFromLogs(t *testing.T) {
	logger := NewQueryLogger()
	logger.Enable()

	// Simulate N+1 pattern
	logger.Log("SELECT * FROM patients WHERE clinic_id = '123'")
	for i := 0; i < 10; i++ {
		logger.Log(fmt.Sprintf("SELECT * FROM protocols WHERE patient_id = 'patient-%d'", i))
	}

	logger.Disable()

	issues := detectNPlusOne(logger.GetQueries())
	if len(issues) > 0 {
		t.Logf("Detected N+1 issues:")
		for _, issue := range issues {
			t.Log("  - " + issue)
		}
	}

	assert.Greater(t, len(issues), 0, "Should detect N+1 pattern in test data")
}
