# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies and ca-certificates
RUN apk add --no-cache git ca-certificates

# Add custom CA certificate for corporate proxy/firewall
COPY trancloud-ca.crt /usr/local/share/ca-certificates/trancloud-ca.crt
RUN update-ca-certificates

# Use Go module proxy (can help bypass some network issues)
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies with retry logic
RUN go mod download || go mod download || go mod download

# Copy source code
COPY . .

# Ensure go.sum is up to date
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/api

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates, wkhtmltopdf for PDF generation, and fonts for Vietnamese
RUN apk --no-cache add ca-certificates tzdata wkhtmltopdf \
    font-noto font-noto-cjk font-noto-extra ttf-dejavu

# Copy binary from builder
COPY --from=builder /api .

# Copy HTML templates for PDF report generation
COPY --from=builder /app/templates ./templates

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./api"]
