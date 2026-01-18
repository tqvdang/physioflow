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
}
