package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
	"github.com/tqvdang/physioflow/apps/api/internal/handler"
	"github.com/tqvdang/physioflow/apps/api/internal/metrics"
	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
)

func main() {
	// Initialize logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("ENV") == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load configuration")
	}

	// Initialize database connection
	var repo *repository.Repository
	if cfg.Database.URL != "" {
		db, err := repository.NewDB(&cfg.Database)
		if err != nil {
			if cfg.IsDevelopment() {
				log.Warn().Err(err).Msg("failed to connect to database, running in mock mode")
				repo = repository.New(cfg)
			} else {
				log.Fatal().Err(err).Msg("failed to connect to database")
			}
		} else {
			repo = repository.NewWithDB(cfg, db)
			defer func() {
				if err := repo.Close(); err != nil {
					log.Error().Err(err).Msg("error closing database connection")
				}
			}()
		}
	} else {
		log.Info().Msg("no database URL configured, running in mock mode")
		repo = repository.New(cfg)
	}

	// Initialize Echo
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	// Set up middleware
	e.Use(echomw.Recover())
	e.Use(middleware.Logger())
	e.Use(middleware.CORS(cfg))

	// Initialize layers
	svc := service.New(repo)
	h := handler.New(svc)

	// Register routes
	registerRoutes(e, h, cfg)

	// Start server
	go func() {
		addr := ":" + cfg.Server.Port
		log.Info().Str("port", cfg.Server.Port).Msg("starting server")
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("failed to start server")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down server")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := e.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("server exited")
}

func registerRoutes(e *echo.Echo, h *handler.Handler, cfg *config.Config) {
	// Health endpoints (no auth required)
	e.GET("/health", h.Health.Health)
	e.GET("/ready", h.Health.Ready)

	// API v1 routes
	v1 := e.Group("/api/v1")

	// Protected routes
	api := v1.Group("")
	api.Use(middleware.Auth(cfg))

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

	// Patient visit checklists (nested under patients)
	patients.POST("/:pid/visit-checklists", h.Checklist.StartChecklist)

	// Quick actions (nested under patients)
	patients.POST("/:pid/quick-pain", h.QuickActions.RecordQuickPain)
	patients.POST("/:pid/quick-rom", h.QuickActions.RecordQuickROM)
	patients.POST("/:pid/quick-schedule", h.QuickActions.QuickSchedule)
	patients.GET("/:pid/pain-history", h.QuickActions.GetPainHistory)
	patients.GET("/:pid/rom-history", h.QuickActions.GetROMHistory)

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
	checklists.GET("/:id/auto-note", h.Checklist.PreviewNote)

	// Appointment routes
	appointments := api.Group("/appointments")
	appointments.GET("", h.Appointment.List)
	appointments.POST("", h.Appointment.Create)
	appointments.GET("/:id", h.Appointment.Get)
	appointments.PUT("/:id", h.Appointment.Update)
	appointments.DELETE("/:id", h.Appointment.Delete)
	appointments.POST("/:id/cancel", h.Appointment.Cancel)
	appointments.GET("/day/:date", h.Appointment.GetDaySchedule)

	// Therapist routes
	therapists := api.Group("/therapists")
	therapists.GET("", h.Appointment.GetTherapists)
	therapists.GET("/:id/availability", h.Appointment.GetTherapistAvailability)

	// Exercise routes
	exercises := api.Group("/exercises")
	exercises.GET("", h.Exercise.List)
	exercises.GET("/:id", h.Exercise.Get)
	exercises.POST("", h.Exercise.Create)
	exercises.PUT("/:id", h.Exercise.Update)
	exercises.DELETE("/:id", h.Exercise.Delete)
	exercises.POST("/:id/prescribe", h.Exercise.PrescribeExercise)
	exercises.GET("/search", h.Exercise.Search)

	// Outcome measures routes (nested under patients)
	outcomeMeasures := patients.Group("/:patientId/outcome-measures")
	outcomeMeasures.POST("", h.OutcomeMeasures.RecordMeasure)
	outcomeMeasures.GET("", h.OutcomeMeasures.GetPatientMeasures)
	outcomeMeasures.GET("/progress", h.OutcomeMeasures.CalculateProgress)
	outcomeMeasures.GET("/trending", h.OutcomeMeasures.GetTrending)

	// Outcome measures library (not nested under patients)
	api.GET("/outcome-measures/library", h.OutcomeMeasures.GetMeasureLibrary)

	// Insurance routes (nested under patients)
	insurance := patients.Group("/:patientId/insurance",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleFrontDesk, middleware.RoleSuperAdmin),
	)
	insurance.POST("", h.Insurance.CreateInsurance)
	insurance.GET("", h.Insurance.GetPatientInsurance)
	insurance.PUT("/:id", h.Insurance.UpdateInsurance)
	insurance.POST("/validate", h.Insurance.ValidateBHYTCard,
		middleware.RateLimit(100, 1*time.Minute),
	)
	insurance.POST("/calculate-coverage", h.Insurance.CalculateCoverage,
		middleware.RateLimit(200, 1*time.Minute),
	)

	// Billing routes (nested under patients)
	billing := patients.Group("/:patientId/billing",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleFrontDesk, middleware.RoleSuperAdmin),
	)
	billing.POST("/invoice", h.Billing.CreateInvoice)
	billing.GET("/invoice/:id", h.Billing.GetInvoice)
	billing.POST("/calculate", h.Billing.CalculateBilling)
	billing.POST("/payment", h.Billing.RecordPayment)
	billing.GET("/history", h.Billing.GetPaymentHistory)

	// Billing service codes (not nested under patients)
	api.GET("/billing/service-codes", h.Billing.GetServiceCodes)

	// BHYT Claim submission routes
	claims := api.Group("/billing/claims",
		middleware.RequireRole(middleware.RoleClinicAdmin, middleware.RoleFrontDesk, middleware.RoleSuperAdmin),
	)
	claims.POST("/generate", h.BHYTClaim.GenerateClaim)
	claims.GET("", h.BHYTClaim.ListClaims)
	claims.GET("/:id", h.BHYTClaim.GetClaim)
	claims.GET("/:id/download", h.BHYTClaim.DownloadClaim)

	// Medical terms routes
	medicalTerms := api.Group("/medical-terms",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleAssistant, middleware.RoleSuperAdmin),
	)
	medicalTerms.GET("/search", h.MedicalTerms.SearchTerms)
	medicalTerms.GET("/category/:category", h.MedicalTerms.GetTermsByCategory)
	medicalTerms.GET("/icd10/:code", h.MedicalTerms.GetTermByICD10)
	medicalTerms.GET("/:id", h.MedicalTerms.GetTermByID)
	medicalTerms.POST("", h.MedicalTerms.CreateCustomTerm)

	// Clinical protocol templates (not nested under patients)
	protocols := api.Group("/protocols",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleSuperAdmin),
	)
	protocols.GET("", h.Protocol.GetProtocols)
	protocols.GET("/:id", h.Protocol.GetProtocolByID)

	// Patient protocol assignments (nested under patients)
	patientProtocols := patients.Group("/:patientId/protocols",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleSuperAdmin),
	)
	patientProtocols.POST("/assign", h.Protocol.AssignProtocol)
	patientProtocols.GET("", h.Protocol.GetPatientProtocols)
	patientProtocols.PUT("/:id/progress", h.Protocol.UpdateProtocolProgress)

	// Discharge planning routes (nested under patients)
	discharge := patients.Group("/:patientId/discharge",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleSuperAdmin),
	)
	discharge.POST("/plan", h.Discharge.CreateDischargePlan)
	discharge.GET("/plan", h.Discharge.GetDischargePlan)
	discharge.POST("/summary", h.Discharge.GenerateDischargeSummary)
	discharge.POST("/complete", h.Discharge.CompleteDischarge)

	// Discharge summary by ID (not nested under patients)
	api.GET("/discharge/summary/:id", h.Discharge.GetDischargeSummary,
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleSuperAdmin),
	)

	// ROM assessment routes (nested under patients)
	romAssessments := patients.Group("/:patientId/assessments/rom",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleSuperAdmin),
	)
	romAssessments.POST("", h.ROM.RecordROM)
	romAssessments.GET("", h.ROM.GetPatientROM)
	romAssessments.GET("/trending", h.ROM.GetROMTrending)

	// MMT assessment routes (nested under patients)
	mmtAssessments := patients.Group("/:patientId/assessments/mmt",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleSuperAdmin),
	)
	mmtAssessments.POST("", h.MMT.RecordMMT)
	mmtAssessments.GET("", h.MMT.GetPatientMMT)
	mmtAssessments.GET("/trending", h.MMT.GetMMTTrending)

	// Pain location routes (per session)
	sessions := api.Group("/sessions",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleSuperAdmin),
	)
	sessions.PUT("/:sessionId/pain-locations", h.PainLocation.UpdatePainLocations)
	sessions.GET("/:sessionId/pain-locations", h.PainLocation.GetPainLocations)

	// Report generation routes (PDF export)
	reports := api.Group("/reports",
		middleware.RequireRole(middleware.RoleTherapist, middleware.RoleClinicAdmin, middleware.RoleFrontDesk, middleware.RoleSuperAdmin),
	)
	reports.GET("/discharge/:id/pdf", h.Report.DischargeSummaryPDF)
	reports.GET("/invoice/:id/pdf", h.Report.InvoicePDF)

	// Metrics endpoint (no auth required)
	// Supports both JSON (default) and Prometheus text format
	e.GET("/metrics", metricsHandler)
}

// metricsHandler returns metrics in JSON or Prometheus format.
// Query parameter: ?format=prometheus for Prometheus text format
// Default: JSON format
func metricsHandler(c echo.Context) error {
	format := c.QueryParam("format")

	if format == "prometheus" {
		// Return Prometheus text format
		exporter := metrics.NewPrometheusExporter()
		return c.String(http.StatusOK, exporter.Export())
	}

	// Default: JSON format
	return c.JSON(http.StatusOK, metrics.GetSnapshot())
}
