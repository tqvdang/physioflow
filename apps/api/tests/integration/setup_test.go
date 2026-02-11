package integration

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
	"github.com/tqvdang/physioflow/apps/api/internal/handler"
	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
)

// TestServer holds the test server and its dependencies.
type TestServer struct {
	Echo   *echo.Echo
	Server *httptest.Server
	Config *config.Config
	DB     *sql.DB
}

var testServer *TestServer

// TestMain runs before all tests to set up the test environment.
func TestMain(m *testing.M) {
	// Load test configuration
	os.Setenv("ENV", "test")

	// Use test database URL if not set
	if os.Getenv("DATABASE_URL") == "" {
		os.Setenv("DATABASE_URL", "postgres://emr:emr_secret_dev_only@localhost:7012/physioflow_test?sslmode=disable")
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize database connection
	db, err := repository.NewDB(&cfg.Database)
	if err != nil {
		fmt.Printf("Failed to connect to database: %v\n", err)
		fmt.Println("Make sure the test database is running. Trying with mock mode...")

		// Fall back to mock mode for CI
		repo := repository.New(cfg)
		testServer = setupTestServer(cfg, nil, repo)

		code := m.Run()
		os.Exit(code)
	}

	// Clean up test data
	cleanupTestData(db)

	// Seed test data
	seedTestData(db)

	repo := repository.NewWithDB(cfg, db)
	testServer = setupTestServer(cfg, db, repo)

	// Run tests
	code := m.Run()

	// Cleanup
	cleanupTestData(db)
	db.Close()

	os.Exit(code)
}

// setupTestServer creates the test server.
func setupTestServer(cfg *config.Config, db *sql.DB, repo *repository.Repository) *TestServer {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(echomw.Recover())
	e.Use(middleware.CORS(cfg))

	svc := service.New(repo)
	h := handler.New(svc)

	// Register routes
	registerTestRoutes(e, h, cfg)

	server := httptest.NewServer(e)

	return &TestServer{
		Echo:   e,
		Server: server,
		Config: cfg,
		DB:     db,
	}
}

// registerTestRoutes registers all API routes for testing.
func registerTestRoutes(e *echo.Echo, h *handler.Handler, cfg *config.Config) {
	// Health endpoints
	e.GET("/health", h.Health.Health)
	e.GET("/ready", h.Health.Ready)

	// API v1 routes
	v1 := e.Group("/api/v1")

	// Protected routes with test auth
	api := v1.Group("")
	api.Use(testAuthMiddleware)

	// Patient routes
	patients := api.Group("/patients")
	patients.GET("", h.Patient.List)
	patients.POST("", h.Patient.Create)
	patients.GET("/search", h.Patient.Search)
	patients.GET("/check-duplicates", h.Patient.CheckDuplicates)
	patients.GET("/:id", h.Patient.Get)
	patients.PUT("/:id", h.Patient.Update)
	patients.DELETE("/:id", h.Patient.Delete)
	patients.GET("/:id/dashboard", h.Patient.Dashboard)

	// Patient visit checklists
	patients.POST("/:pid/visit-checklists", h.Checklist.StartChecklist)

	// Checklist templates
	templates := api.Group("/checklist-templates")
	templates.GET("", h.Checklist.ListTemplates)
	templates.GET("/:id", h.Checklist.GetTemplate)

	// Visit checklists
	checklists := api.Group("/visit-checklists")
	checklists.GET("/:id", h.Checklist.GetChecklist)
	checklists.PATCH("/:id/responses", h.Checklist.UpdateResponses)
	checklists.PATCH("/:id/responses/:itemId", h.Checklist.UpdateResponse)
	checklists.POST("/:id/complete", h.Checklist.CompleteChecklist)

	// Appointments
	appointments := api.Group("/appointments")
	appointments.GET("", h.Appointment.List)
	appointments.POST("", h.Appointment.Create)
	appointments.GET("/:id", h.Appointment.Get)
	appointments.PUT("/:id", h.Appointment.Update)
	appointments.DELETE("/:id", h.Appointment.Delete)
	appointments.POST("/:id/cancel", h.Appointment.Cancel)
	appointments.GET("/day/:date", h.Appointment.GetDaySchedule)

	// Therapists
	therapists := api.Group("/therapists")
	therapists.GET("", h.Appointment.GetTherapists)
	therapists.GET("/:id/availability", h.Appointment.GetTherapistAvailability)

	// Exercises
	exercises := api.Group("/exercises")
	exercises.GET("", h.Exercise.List)
	exercises.GET("/:id", h.Exercise.Get)
	exercises.POST("", h.Exercise.Create)
	exercises.PUT("/:id", h.Exercise.Update)
	exercises.DELETE("/:id", h.Exercise.Delete)
	exercises.POST("/:id/prescribe", h.Exercise.PrescribeExercise)
	exercises.GET("/search", h.Exercise.Search)

	// Insurance routes
	patients.POST("/:patientId/insurance", h.Insurance.CreateInsurance)
	patients.GET("/:patientId/insurance", h.Insurance.GetPatientInsurance)
	patients.PUT("/:patientId/insurance/:id", h.Insurance.UpdateInsurance)
	patients.POST("/:patientId/insurance/validate", h.Insurance.ValidateBHYTCard)
	patients.POST("/:patientId/insurance/calculate-coverage", h.Insurance.CalculateCoverage)

	// Outcome measures routes
	patients.POST("/:patientId/outcome-measures", h.OutcomeMeasures.RecordMeasure)
	patients.GET("/:patientId/outcome-measures", h.OutcomeMeasures.GetPatientMeasures)
	patients.GET("/:patientId/outcome-measures/progress", h.OutcomeMeasures.CalculateProgress)
	patients.GET("/:patientId/outcome-measures/trending", h.OutcomeMeasures.GetTrending)
	api.GET("/outcome-measures/library", h.OutcomeMeasures.GetMeasureLibrary)

	// Billing routes
	patients.POST("/:patientId/billing/invoice", h.Billing.CreateInvoice)
	patients.GET("/:patientId/billing/invoice/:id", h.Billing.GetInvoice)
	patients.POST("/:patientId/billing/calculate", h.Billing.CalculateBilling)
	patients.POST("/:patientId/billing/payment", h.Billing.RecordPayment)
	patients.GET("/:patientId/billing/history", h.Billing.GetPaymentHistory)
	api.GET("/billing/service-codes", h.Billing.GetServiceCodes)

	// Protocol routes
	api.GET("/protocols", h.Protocol.GetProtocols)
	api.GET("/protocols/:id", h.Protocol.GetProtocolByID)
	patients.POST("/:patientId/protocols/assign", h.Protocol.AssignProtocol)
	patients.GET("/:patientId/protocols", h.Protocol.GetPatientProtocols)
	patients.PUT("/:patientId/protocols/:id/progress", h.Protocol.UpdateProtocolProgress)

	// Discharge routes
	patients.POST("/:patientId/discharge/plan", h.Discharge.CreateDischargePlan)
	patients.GET("/:patientId/discharge/plan", h.Discharge.GetDischargePlan)
	patients.POST("/:patientId/discharge/summary", h.Discharge.GenerateDischargeSummary)
	patients.POST("/:patientId/discharge/complete", h.Discharge.CompleteDischarge)
	api.GET("/discharge/summary/:id", h.Discharge.GetDischargeSummary)

	// Medical terms routes
	api.GET("/medical-terms/search", h.MedicalTerms.SearchTerms)
	api.GET("/medical-terms/:id", h.MedicalTerms.GetTermByID)
	api.POST("/medical-terms", h.MedicalTerms.CreateCustomTerm)
	api.GET("/medical-terms/category/:category", h.MedicalTerms.GetTermsByCategory)
	api.GET("/medical-terms/icd10/:code", h.MedicalTerms.GetTermByICD10)
}

// testAuthMiddleware provides mock authentication for tests.
func testAuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Set test user context
		user := &middleware.UserClaims{
			UserID:   "test-user-id",
			ClinicID: "test-clinic-id",
			Username: "therapist1",
			Email:    "therapist1@example.com",
			Roles:    []string{"therapist"},
		}
		c.Set("user", user)
		return next(c)
	}
}

// cleanupTestData removes test data from the database.
func cleanupTestData(db *sql.DB) {
	if db == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	tables := []string{
		"prescription_logs",
		"prescriptions",
		"checklist_item_responses",
		"visit_checklists",
		"appointments",
		"patient_insurance",
		"patients",
	}

	for _, table := range tables {
		// Only delete test data (clinic_id = 'test-clinic-id')
		query := fmt.Sprintf("DELETE FROM %s WHERE clinic_id = $1", table)
		_, _ = db.ExecContext(ctx, query, "test-clinic-id")
	}
}

// seedTestData inserts test data into the database.
func seedTestData(db *sql.DB) {
	if db == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Seed test patients
	patientQueries := []string{
		`INSERT INTO patients (id, clinic_id, mrn, first_name, last_name, date_of_birth, gender, phone, email, is_active, created_at, updated_at)
		 VALUES ('11111111-1111-1111-1111-111111111111', 'test-clinic-id', 'MRN-TEST-001', 'John', 'Doe', '1990-01-15', 'male', '0901234567', 'john@example.com', true, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO patients (id, clinic_id, mrn, first_name, last_name, date_of_birth, gender, phone, email, is_active, created_at, updated_at)
		 VALUES ('22222222-2222-2222-2222-222222222222', 'test-clinic-id', 'MRN-TEST-002', 'Jane', 'Smith', '1985-06-20', 'female', '0909876543', 'jane@example.com', true, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO patients (id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi, date_of_birth, gender, phone, language_preference, is_active, created_at, updated_at)
		 VALUES ('33333333-3333-3333-3333-333333333333', 'test-clinic-id', 'MRN-TEST-003', 'Minh', 'Nguyen', 'Minh', 'Nguyễn', '1975-12-01', 'male', '0912345678', 'vi', true, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
	}

	for _, query := range patientQueries {
		_, err := db.ExecContext(ctx, query)
		if err != nil {
			fmt.Printf("Warning: failed to seed patient: %v\n", err)
		}
	}

	// Seed test appointments
	appointmentQueries := []string{
		`INSERT INTO appointments (id, clinic_id, patient_id, therapist_id, start_time, end_time, status, type, created_at, updated_at)
		 VALUES ('aaaa1111-1111-1111-1111-111111111111', 'test-clinic-id', '11111111-1111-1111-1111-111111111111', 'test-user-id', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour', 'scheduled', 'follow_up', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
	}

	for _, query := range appointmentQueries {
		_, err := db.ExecContext(ctx, query)
		if err != nil {
			fmt.Printf("Warning: failed to seed appointment: %v\n", err)
		}
	}
}

// Helper functions for tests

// doRequest performs an HTTP request and returns the response.
func doRequest(t *testing.T, method, path string, body interface{}) *http.Response {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("Failed to marshal request body: %v", err)
		}
		reqBody = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, testServer.Server.URL+path, reqBody)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer test-token")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to execute request: %v", err)
	}

	return resp
}

// parseResponse parses the response body into the given interface.
func parseResponse(t *testing.T, resp *http.Response, v interface{}) {
	t.Helper()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	defer resp.Body.Close()

	if err := json.Unmarshal(body, v); err != nil {
		t.Fatalf("Failed to unmarshal response: %v\nBody: %s", err, string(body))
	}
}

// assertStatus checks if the response status matches expected.
func assertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	if resp.StatusCode != expected {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("Expected status %d, got %d. Body: %s", expected, resp.StatusCode, string(body))
	}
}
