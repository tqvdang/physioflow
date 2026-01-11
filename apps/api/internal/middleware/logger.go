package middleware

import (
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

// Logger returns a middleware that logs HTTP requests using zerolog.
func Logger() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()

			req := c.Request()
			res := c.Response()

			// Process request
			err := next(c)
			if err != nil {
				c.Error(err)
			}

			// Calculate latency
			latency := time.Since(start)

			// Get request ID
			requestID := req.Header.Get(echo.HeaderXRequestID)
			if requestID == "" {
				requestID = res.Header().Get(echo.HeaderXRequestID)
			}

			// Build log event
			event := log.Info()
			if res.Status >= 500 {
				event = log.Error()
			} else if res.Status >= 400 {
				event = log.Warn()
			}

			// Log the request
			event.
				Str("request_id", requestID).
				Str("method", req.Method).
				Str("uri", req.RequestURI).
				Str("remote_addr", c.RealIP()).
				Int("status", res.Status).
				Int64("size", res.Size).
				Dur("latency", latency).
				Str("user_agent", req.UserAgent()).
				Msg("http request")

			return nil
		}
	}
}
