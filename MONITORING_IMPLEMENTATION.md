# PhysioFlow Monitoring & Observability Implementation

## Overview

This document provides a comprehensive overview of the monitoring and observability stack implemented for PhysioFlow.

## Implementation Summary

### Files Created/Modified

#### 1. API Metrics Enhancement
- **apps/api/internal/metrics/metrics.go** - Enhanced with 33+ metrics across 6 feature domains
- **apps/api/internal/metrics/prometheus.go** - NEW: Prometheus text format exporter
- **apps/api/cmd/api/main.go** - Updated: Dual format metrics endpoint (JSON + Prometheus)

#### 2. Structured Logging Enhancement
- **apps/api/internal/middleware/logger.go** - Enhanced with PHI audit trail, user context, Vietnamese PT tagging

#### 3. Local Development (Docker)
- **infrastructure/docker/prometheus/prometheus.yml** - Prometheus scrape configuration
- **infrastructure/docker/grafana/provisioning/datasources/datasources.yml** - Grafana datasources
- **infrastructure/docker/grafana/provisioning/dashboards/dashboards.yml** - Dashboard provisioning
- **infrastructure/docker/grafana/provisioning/dashboards/json/physioflow-pt-features.json** - PT Features dashboard
- **infrastructure/docker/promtail/promtail-config.yml** - Promtail log shipper config
- **infrastructure/docker/docker-compose.monitoring.yml** - Monitoring stack docker-compose
- **infrastructure/docker/Makefile** - Updated: Added monitoring commands
- **infrastructure/docker/MONITORING.md** - Comprehensive monitoring documentation

#### 4. Homelab K8s Deployment
- **infrastructure/homelab/k8s/base/configmap-grafana-dashboards.yaml** - Grafana dashboards ConfigMap
- **infrastructure/homelab/k8s/base/configmap-loki-config.yaml** - Loki configuration ConfigMap
- **infrastructure/homelab/k8s/base/prometheusrule-physioflow.yaml** - Prometheus alert rules
- **infrastructure/homelab/k8s/base/kustomization.yaml** - Updated: Added monitoring resources

## Metrics Catalog (33+ metrics)

### BHYT Insurance (7 metrics)
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| bhyt_validations_total | counter | status, prefix_code | Total BHYT card validations |
| bhyt_validation_errors_total | counter | error_type | Total validation errors |
| bhyt_coverage_calculations_total | counter | - | Total coverage calculations |
| bhyt_coverage_avg_duration_ms | gauge | - | Average calculation duration |
| bhyt_coverage_p50_duration_ms | gauge | - | p50 calculation duration |
| bhyt_coverage_p95_duration_ms | gauge | - | p95 calculation duration |
| bhyt_coverage_p99_duration_ms | gauge | - | p99 calculation duration |

### Outcome Measures (4 metrics)
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| outcome_measures_recorded_total | counter | measure_type, phase | Total outcome measures recorded |
| outcome_progress_calculations_total | counter | - | Total progress calculations |
| outcome_progress_avg_duration_ms | gauge | - | Average calculation duration |
| outcome_progress_p95_duration_ms | gauge | - | p95 calculation duration |

### Billing (3 metrics)
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| billing_invoices_created_total | counter | status | Total invoices created |
| billing_payments_recorded_total | counter | payment_method | Total payments recorded |
| billing_calculation_errors_total | counter | - | Total billing errors |

### Protocols (2 metrics)
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| protocols_assigned_total | counter | protocol_id | Total protocols assigned |
| protocols_completed_total | counter | - | Total protocols completed |

### Discharge (4 metrics)
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| discharge_summaries_generated_total | counter | - | Total summaries generated |
| discharge_pdf_generations_total | counter | - | Total PDF generations |
| discharge_pdf_avg_duration_ms | gauge | - | Average PDF generation time |
| discharge_pdf_p95_duration_ms | gauge | - | p95 PDF generation time |

### Medical Terms (3 metrics)
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| medical_terms_search_total | counter | - | Total term searches |
| medical_terms_search_avg_duration_ms | gauge | - | Average search duration |
| medical_terms_search_p95_duration_ms | gauge | - | p95 search duration |

### API Requests (5+ metrics)
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| api_requests_total | counter | endpoint, method, status | Total API requests |
| api_request_duration_avg_ms | gauge | endpoint, method | Average request duration |
| api_request_duration_p50_ms | gauge | endpoint, method | p50 request duration |
| api_request_duration_p95_ms | gauge | endpoint, method | p95 request duration |
| api_request_duration_p99_ms | gauge | endpoint, method | p99 request duration |

## Grafana Dashboards

### 1. PhysioFlow PT Features Dashboard
**UID**: physioflow-pt-features

**Panels**:
1. BHYT Validation Rate (time series) - Shows validation throughput by status
2. BHYT Coverage Calculation Latency (time series) - Shows p50, p95, p99 latencies
3. Outcome Measures by Type (pie chart) - Distribution of measure types
4. Billing Invoice Creation Rate (time series) - Invoice creation throughput by status
5. Protocol Assignment Rate (time series) - Protocol assignments by protocol_id
6. Discharge Summary Generation Latency (time series) - PDF generation performance
7. Medical Term Search Rate (time series) - Search throughput
8. Medical Term Search Latency (gauge) - Current search performance
9. API Error Rates by Endpoint (time series) - Error rates by endpoint and method

### 2. PhysioFlow Database Dashboard
**UID**: physioflow-database

**Panels**:
1. Query Execution Time by Table - Average query performance
2. Connection Pool Usage - Active vs max connections
3. Slow Query Count - Queries exceeding thresholds
4. Table Activity - Insert/Update/Delete operations

## Prometheus Alerts (9 rules)

### BHYT Alerts
1. **BHYTHighErrorRate**
   - Threshold: Error rate > 5%
   - Duration: 5 minutes
   - Severity: warning
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/bhyt-high-error-rate

2. **BHYTCoverageCalculationSlow**
   - Threshold: p95 latency > 1000ms
   - Duration: 5 minutes
   - Severity: warning
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/bhyt-slow-calculation

### Outcome Measures Alerts
3. **OutcomeMeasuresSlowCalculation**
   - Threshold: p95 latency > 1000ms
   - Duration: 5 minutes
   - Severity: warning
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/outcome-measures-slow

### Billing Alerts
4. **BillingCalculationErrors**
   - Threshold: Error rate > 1%
   - Duration: 5 minutes
   - Severity: critical
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/billing-errors

### Discharge Alerts
5. **DischargePDFGenerationSlow**
   - Threshold: p95 latency > 5000ms
   - Duration: 5 minutes
   - Severity: warning
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/discharge-pdf-slow

### Medical Terms Alerts
6. **MedicalTermSearchSlow**
   - Threshold: p95 latency > 500ms
   - Duration: 5 minutes
   - Severity: warning
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/medical-terms-slow

### API Alerts
7. **APIHighErrorRate**
   - Threshold: 5xx error rate > 5%
   - Duration: 5 minutes
   - Severity: critical
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/api-high-error-rate

8. **APIHighLatency**
   - Threshold: p95 latency > 2s
   - Duration: 5 minutes
   - Severity: warning
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/api-high-latency

### Database Alerts
9. **DatabaseConnectionPoolExhausted**
   - Threshold: Connection usage > 90%
   - Duration: 5 minutes
   - Severity: critical
   - Runbook: https://wiki.trancloud.work/physioflow/runbooks/db-connection-pool

10. **DatabaseSlowQueries**
    - Threshold: Query execution time > 1s
    - Duration: 10 minutes
    - Severity: warning
    - Runbook: https://wiki.trancloud.work/physioflow/runbooks/db-slow-queries

## Logging Enhancements

### Structured Fields
All API requests now log the following fields:

**Core Fields**:
- `request_id` - Unique request identifier (for correlation)
- `method` - HTTP method (GET, POST, etc.)
- `uri` - Full request URI
- `path` - Route path pattern
- `status` - HTTP status code
- `latency` - Request duration (both duration and latency_ms)
- `remote_addr` - Client IP address
- `user_agent` - Client user agent

**Context Fields** (when available):
- `user_id` - Authenticated user ID
- `patient_id` - Patient ID (for PHI audit trail)
- `feature` - Feature tag (e.g., "vietnamese_pt")

**Error Fields** (on errors):
- `error` - Error message and stack trace

### Log Levels
- **INFO**: Successful requests (2xx, 3xx)
- **WARN**: Client errors (4xx)
- **ERROR**: Server errors (5xx) with stack traces

### Vietnamese PT Endpoint Tagging
All Vietnamese PT-specific endpoints are automatically tagged with `feature: vietnamese_pt` for easy filtering.

Endpoints tagged:
- `/api/v1/patients/:patientId/insurance` (BHYT)
- `/api/v1/patients/:patientId/billing`
- `/api/v1/patients/:patientId/outcome-measures`
- `/api/v1/patients/:patientId/protocols`
- `/api/v1/patients/:patientId/discharge`
- `/api/v1/medical-terms`
- `/api/v1/protocols`
- `/api/v1/billing/service-codes`

## Usage Guide

### Local Development

#### Start Monitoring Stack
```bash
cd infrastructure/docker
make up-monitoring
```

#### Access Services
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Loki**: http://localhost:3100

#### View Metrics
```bash
# JSON format (default)
curl http://localhost:7011/metrics | jq .

# Prometheus format
curl http://localhost:7011/metrics?format=prometheus

# Or use Makefile commands
make metrics                # JSON
make metrics-prometheus     # Prometheus format
```

#### Stop Monitoring Stack
```bash
make down-monitoring
```

### Recording Metrics in Code

```go
import (
    "time"
    "github.com/tqvdang/physioflow/apps/api/internal/metrics"
)

// BHYT Insurance
metrics.RecordBHYTValidation("success", "DN1")
metrics.RecordValidationError("invalid_format")

start := time.Now()
// ... perform coverage calculation ...
metrics.RecordCoverageCalculation(time.Since(start))

// Outcome Measures
metrics.RecordOutcomeMeasure("ROM", "initial")

start = time.Now()
// ... calculate progress ...
metrics.RecordOutcomeProgressCalculation(time.Since(start))

// Billing
metrics.RecordBillingInvoice("paid")
metrics.RecordBillingPayment("cash")
metrics.RecordBillingCalculationError()

// Protocols
metrics.RecordProtocolAssignment("ACL-REHAB-001")
metrics.RecordProtocolCompletion()

// Discharge
metrics.RecordDischargeSummary()

start = time.Now()
// ... generate PDF ...
metrics.RecordDischargePDFGeneration(time.Since(start))

// Medical Terms
start = time.Now()
// ... perform search ...
metrics.RecordMedicalTermsSearch(time.Since(start))

// API requests are recorded automatically by middleware
// But you can also record manually:
start = time.Now()
// ... handle request ...
metrics.RecordAPIRequest("/api/v1/patients", "GET", 200, time.Since(start))
```

### Homelab Deployment

#### Deploy to K3s
```bash
# Deploy to dev environment
kubectl apply -k infrastructure/homelab/k8s/overlays/dev

# Check resources
kubectl get prometheusrules -n physioflow-dev
kubectl get configmap grafana-dashboards -n physioflow-dev
kubectl get configmap loki-config -n physioflow-dev
```

#### View Metrics in Production
```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Port-forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Access at http://localhost:9090 and http://localhost:3000
```

## Loki Queries

### Common Queries

```promql
# All API logs
{app="physioflow-api"}

# Errors only
{app="physioflow-api"} |= "level=error"

# BHYT validation errors
{app="physioflow-api"} |= "bhyt" |= "error"

# Specific patient (PHI audit)
{app="physioflow-api"} |= "patient_id=123"

# Vietnamese PT features
{app="physioflow-api"} |= "feature=vietnamese_pt"

# Slow requests (>1s)
{app="physioflow-api"} | json | latency_ms > 1000

# 5xx errors
{app="physioflow-api"} | json | status >= 500
```

## Next Steps

### 1. Test Locally
```bash
cd infrastructure/docker
make up-all  # Start all services + monitoring
# Generate some API traffic
make metrics-prometheus
```

### 2. Deploy to Homelab
```bash
kubectl apply -k infrastructure/homelab/k8s/overlays/dev
kubectl get pods -n physioflow-dev -w
```

### 3. Update Infrastructure Documentation
Update `/mnt/d/Cloud/OneDrive/IT/infrastructure.yaml`:

```yaml
physioflow:
  monitoring:
    prometheus:
      url: https://prometheus.trancloud.work
      retention: 30d
      scrape_interval: 15s
    grafana:
      url: https://grafana.trancloud.work
      admin_user: admin
      dashboards:
        - physioflow-pt-features
        - physioflow-database
    loki:
      url: https://loki.trancloud.work
      retention: 30d
    alertmanager:
      url: https://alertmanager.trancloud.work
      routes:
        slack: "#physioflow-alerts"
        email: "ops@trancloud.work"
```

### 4. Configure Alert Routing
Set up Alertmanager to route alerts to Slack/email:

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-physioflow'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        feature: vietnamese_pt
      receiver: 'slack-pt-team'

receivers:
  - name: 'slack-physioflow'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#physioflow-alerts'
```

### 5. Create Custom Dashboards
Add workflow-specific dashboards:
- BHYT Validation Dashboard (detailed validation analytics)
- Billing Dashboard (invoice and payment tracking)
- Discharge Dashboard (discharge process monitoring)
- Patient Journey Dashboard (end-to-end patient flow)

### 6. Set Up Log Retention Policy
Configure Loki retention per namespace:
- Development: 7 days
- Staging: 14 days
- Production: 30 days

### 7. Add Synthetic Monitoring
Set up Prometheus Blackbox Exporter for uptime monitoring:
- API health check: https://physioflow.trancloud.work/health
- Web app: https://physioflow.trancloud.work
- Keycloak: https://keycloak.trancloud.work

## Troubleshooting

### Metrics Not Appearing
1. Check API metrics endpoint: `curl http://localhost:7011/metrics?format=prometheus`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify Prometheus scrape config in `prometheus.yml`

### Dashboards Not Loading
1. Check Grafana datasources: http://localhost:3000/datasources
2. Test Prometheus connection
3. Verify ConfigMap: `kubectl get configmap grafana-dashboards -n physioflow-dev -o yaml`

### Alerts Not Firing
1. Check PrometheusRule: `kubectl get prometheusrules -n physioflow-dev`
2. Check Prometheus rules: http://localhost:9090/rules
3. Check alert state: http://localhost:9090/alerts

### Logs Not Appearing in Loki
1. Check Promtail is running: `docker ps | grep promtail`
2. Check Promtail logs: `docker logs physioflow-promtail`
3. Verify Loki datasource in Grafana

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [PrometheusRule CRD](https://prometheus-operator.dev/docs/operator/api/#prometheusrule)
- [zerolog Documentation](https://github.com/rs/zerolog)
- [Full Monitoring Guide](infrastructure/docker/MONITORING.md)
