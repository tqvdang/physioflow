# PhysioFlow Monitoring & Observability Stack

This document describes the comprehensive monitoring and observability setup for PhysioFlow.

## Overview

The monitoring stack consists of:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation and querying
- **Alertmanager**: Alert routing and management (optional)

## Architecture

```
┌─────────────┐
│ PhysioFlow  │
│    API      │──┐
│  (/metrics) │  │
└─────────────┘  │
                 │ scrape
┌─────────────┐  │    ┌──────────────┐
│ PostgreSQL  │──┼───>│  Prometheus  │
│  Exporter   │  │    │              │
└─────────────┘  │    └──────┬───────┘
                 │           │
┌─────────────┐  │           │ query
│   Redis     │──┘           │
│  Exporter   │              │
└─────────────┘              │
                             v
                    ┌─────────────┐
                    │   Grafana   │
                    │ Dashboards  │
                    └─────────────┘
```

## Metrics

### BHYT Insurance Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `bhyt_validations_total` | counter | status, prefix_code | Total BHYT validations |
| `bhyt_validation_errors_total` | counter | error_type | Total BHYT validation errors |
| `bhyt_coverage_calculations_total` | counter | - | Total coverage calculations |
| `bhyt_coverage_p50_duration_ms` | gauge | - | Coverage calculation p50 latency |
| `bhyt_coverage_p95_duration_ms` | gauge | - | Coverage calculation p95 latency |
| `bhyt_coverage_p99_duration_ms` | gauge | - | Coverage calculation p99 latency |

### Outcome Measures Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `outcome_measures_recorded_total` | counter | measure_type, phase | Total outcome measures recorded |
| `outcome_progress_calculations_total` | counter | - | Total progress calculations |
| `outcome_progress_avg_duration_ms` | gauge | - | Average progress calculation time |
| `outcome_progress_p95_duration_ms` | gauge | - | p95 progress calculation time |

### Billing Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `billing_invoices_created_total` | counter | status | Total invoices created |
| `billing_payments_recorded_total` | counter | payment_method | Total payments recorded |
| `billing_calculation_errors_total` | counter | - | Total billing calculation errors |

### Protocol Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `protocols_assigned_total` | counter | protocol_id | Total protocols assigned |
| `protocols_completed_total` | counter | - | Total protocols completed |

### Discharge Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `discharge_summaries_generated_total` | counter | - | Total discharge summaries generated |
| `discharge_pdf_generations_total` | counter | - | Total PDF generations |
| `discharge_pdf_avg_duration_ms` | gauge | - | Average PDF generation time |
| `discharge_pdf_p95_duration_ms` | gauge | - | p95 PDF generation time |

### Medical Terms Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `medical_terms_search_total` | counter | - | Total medical term searches |
| `medical_terms_search_avg_duration_ms` | gauge | - | Average search time |
| `medical_terms_search_p95_duration_ms` | gauge | - | p95 search time |

### API Request Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `api_requests_total` | counter | endpoint, method, status | Total API requests |
| `api_request_duration_avg_ms` | gauge | endpoint, method | Average request duration |
| `api_request_duration_p95_ms` | gauge | endpoint, method | p95 request duration |
| `api_request_duration_p99_ms` | gauge | endpoint, method | p99 request duration |

## Metrics Endpoint

The API exposes metrics at `/metrics` endpoint in two formats:

### JSON Format (default)

```bash
curl http://localhost:7011/metrics
```

Returns a JSON snapshot of all metrics.

### Prometheus Format

```bash
curl http://localhost:7011/metrics?format=prometheus
```

Returns Prometheus text format for scraping.

## Grafana Dashboards

### PhysioFlow PT Features Dashboard

Location: `infrastructure/docker/grafana/provisioning/dashboards/json/physioflow-pt-features.json`

Panels:
- BHYT Validation Rate (time series)
- BHYT Coverage Calculation Latency (p50, p95, p99)
- Outcome Measures by Type (pie chart)
- Billing Invoice Creation Rate (time series)
- Protocol Assignment Rate (time series)
- Discharge Summary Generation Latency (time series)
- Medical Term Search Rate and Latency
- API Error Rates by Endpoint

### PhysioFlow Database Dashboard

Panels:
- Query Execution Time by Table
- Connection Pool Usage
- Slow Query Count
- Table Activity

## Alerts

Alert rules are defined in `infrastructure/homelab/k8s/base/prometheusrule-physioflow.yaml`.

### BHYT Alerts

- **BHYTHighErrorRate**: Fires when BHYT validation error rate > 5%
- **BHYTCoverageCalculationSlow**: Fires when p95 latency > 1000ms

### Outcome Measures Alerts

- **OutcomeMeasuresSlowCalculation**: Fires when p95 latency > 1000ms

### Billing Alerts

- **BillingCalculationErrors**: Fires when error rate > 1%

### Discharge Alerts

- **DischargePDFGenerationSlow**: Fires when p95 latency > 5000ms

### Medical Terms Alerts

- **MedicalTermSearchSlow**: Fires when p95 latency > 500ms

### API Alerts

- **APIHighErrorRate**: Fires when 5xx error rate > 5%
- **APIHighLatency**: Fires when p95 latency > 2s

### Database Alerts

- **DatabaseConnectionPoolExhausted**: Fires when connection usage > 90%
- **DatabaseSlowQueries**: Fires when query execution time > 1s

## Local Development

### Start Monitoring Stack

```bash
cd infrastructure/docker
make up-monitoring
```

### Access Services

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Loki**: http://localhost:3100

### View Metrics

```bash
# View JSON metrics
curl http://localhost:7011/metrics

# View Prometheus metrics
curl http://localhost:7011/metrics?format=prometheus
```

## Production Deployment

### Homelab K8s Deployment

The monitoring stack is deployed to the K3s cluster using Kustomize.

```bash
# Deploy to dev environment
kubectl apply -k infrastructure/homelab/k8s/overlays/dev

# Check Prometheus rules
kubectl get prometheusrules -n physioflow-dev

# Check Grafana dashboards ConfigMap
kubectl get configmap grafana-dashboards -n physioflow-dev -o yaml

# Check Loki configuration
kubectl get configmap loki-config -n physioflow-dev -o yaml
```

### Update Infrastructure Reference

After deploying monitoring stack, update `/mnt/d/Cloud/OneDrive/IT/infrastructure.yaml`:

```yaml
physioflow:
  monitoring:
    prometheus:
      url: https://prometheus.trancloud.work
      retention: 30d
    grafana:
      url: https://grafana.trancloud.work
      dashboards:
        - physioflow-pt-features
        - physioflow-database
    loki:
      url: https://loki.trancloud.work
      retention: 30d
    alerts:
      - bhyt-high-error-rate
      - outcome-measures-slow
      - billing-calculation-errors
      - discharge-pdf-slow
      - medical-term-search-slow
      - api-high-error-rate
      - api-high-latency
      - db-connection-pool
      - db-slow-queries
```

## Logging

### Structured Logging

The API uses zerolog for structured logging. All logs include:

- `request_id`: Unique request identifier
- `method`: HTTP method
- `uri`: Request URI
- `path`: Route path
- `status`: HTTP status code
- `latency`: Request duration
- `user_id`: User identifier (if authenticated)
- `patient_id`: Patient identifier (for PHI audit trail)

### Vietnamese PT Endpoints

All Vietnamese PT-specific endpoints are automatically tagged with `feature: vietnamese_pt`.

### Log Levels

- **INFO**: All successful requests
- **WARN**: 4xx client errors
- **ERROR**: 5xx server errors (includes stack traces)

### Loki Queries

```promql
# View all API logs
{app="physioflow-api"}

# View errors only
{app="physioflow-api"} |= "level=error"

# View BHYT validation errors
{app="physioflow-api"} |= "bhyt" |= "error"

# View logs for specific patient (PHI audit)
{app="physioflow-api"} |= "patient_id=123"

# View Vietnamese PT feature logs
{app="physioflow-api"} |= "feature=vietnamese_pt"
```

## Best Practices

### Recording Metrics

Always record metrics in the appropriate handler:

```go
import "github.com/tqvdang/physioflow/apps/api/internal/metrics"

// Record BHYT validation
metrics.RecordBHYTValidation("success", "DN1")

// Record validation error
metrics.RecordValidationError("invalid_format")

// Record coverage calculation duration
start := time.Now()
// ... perform calculation ...
metrics.RecordCoverageCalculation(time.Since(start))

// Record outcome measure
metrics.RecordOutcomeMeasure("ROM", "initial")

// Record billing invoice
metrics.RecordBillingInvoice("paid")

// Record billing payment
metrics.RecordBillingPayment("cash")

// Record protocol assignment
metrics.RecordProtocolAssignment("ACL-REHAB-001")

// Record discharge summary
metrics.RecordDischargeSummary()

// Record discharge PDF generation
start := time.Now()
// ... generate PDF ...
metrics.RecordDischargePDFGeneration(time.Since(start))

// Record medical terms search
start := time.Now()
// ... perform search ...
metrics.RecordMedicalTermsSearch(time.Since(start))
```

### Logging Best Practices

```go
// Always include request context
log.Info().
    Str("request_id", requestID).
    Str("user_id", userID).
    Str("patient_id", patientID).
    Msg("processing BHYT validation")

// Include error details
log.Error().
    Err(err).
    Str("request_id", requestID).
    Str("operation", "bhyt_validation").
    Msg("BHYT validation failed")
```

## Troubleshooting

### Metrics Not Appearing

1. Check API `/metrics` endpoint:
   ```bash
   curl http://localhost:7011/metrics?format=prometheus
   ```

2. Check Prometheus targets:
   - Open http://localhost:9090/targets
   - Verify API target is UP

3. Check Prometheus scrape logs:
   ```bash
   docker logs prometheus
   ```

### Dashboards Not Loading

1. Check Grafana datasources:
   - Open http://localhost:3000/datasources
   - Test Prometheus connection

2. Check ConfigMap in K8s:
   ```bash
   kubectl get configmap grafana-dashboards -n physioflow-dev
   ```

### Alerts Not Firing

1. Check PrometheusRule:
   ```bash
   kubectl get prometheusrules -n physioflow-dev
   ```

2. Check Prometheus rules:
   - Open http://localhost:9090/rules
   - Verify rules are loaded

3. Check alert evaluation:
   - Open http://localhost:9090/alerts
   - Check alert state

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [PrometheusRule CRD](https://prometheus-operator.dev/docs/operator/api/#prometheusrule)
