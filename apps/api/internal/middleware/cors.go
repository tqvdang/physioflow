package middleware

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
)

// CORS returns a CORS middleware configured for the application.
func CORS(cfg *config.Config) echo.MiddlewareFunc {
	// Development configuration - permissive
	if cfg.IsDevelopment() {
		return middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: []string{
				"http://localhost:7010",
				"http://localhost:7011",
				"http://localhost:5173",
				"http://127.0.0.1:7010",
				"http://127.0.0.1:5173",
			},
			AllowMethods: []string{
				echo.GET,
				echo.POST,
				echo.PUT,
				echo.PATCH,
				echo.DELETE,
				echo.OPTIONS,
			},
			AllowHeaders: []string{
				echo.HeaderOrigin,
				echo.HeaderContentType,
				echo.HeaderAccept,
				echo.HeaderAuthorization,
				echo.HeaderXRequestID,
				"X-Tenant-ID",
			},
			ExposeHeaders: []string{
				echo.HeaderContentLength,
				echo.HeaderXRequestID,
				"X-Total-Count",
			},
			AllowCredentials: true,
			MaxAge:           86400,
		})
	}

	// Production configuration - restrictive
	return middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOriginFunc: func(origin string) (bool, error) {
			// TODO: Implement proper origin validation for production
			// Should check against allowed domains from config
			return false, nil
		},
		AllowMethods: []string{
			echo.GET,
			echo.POST,
			echo.PUT,
			echo.PATCH,
			echo.DELETE,
		},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
			"X-Tenant-ID",
		},
		ExposeHeaders: []string{
			"X-Total-Count",
		},
		AllowCredentials: true,
		MaxAge:           3600,
	})
}
