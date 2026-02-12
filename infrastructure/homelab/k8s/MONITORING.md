# PhysioFlow Monitoring and Observability

Wave 5 implementation of comprehensive monitoring for PhysioFlow Vietnamese PT features.

## Overview

PhysioFlow uses a three-pillar observability approach:
1. **Metrics** - Prometheus with custom Go metrics for PT features
2. **Logs** - Structured JSON logging with zerolog, aggregated by Loki
3. **Traces** - Request tracing with correlation IDs (future: OpenTelemetry)

## Architecture

```
┌─────────────────┐
│  PhysioFlow API │
│   (Go/Echo)     │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│   Prometheus    │                  │      Loki       │
│   (Metrics)     │                  │     (Logs)      │
└────────┬────────┘                  └────────┬────────┘
         │                                     │
         └────────────────┬────────────────────┘
                          ▼
                 ┌─────────────────┐
                 │    Grafana      │
                 │  (Dashboards)   │
                 └─────────────────┘
```

## Metrics

### Vietnamese PT Feature Metrics

#### 1. BHYT Insurance (33+ metrics)

**Counters:**
- `bhyt_validations_total{status, prefix_code}` - Total BHYT card validations
- `bhyt_validation_errors_total{error_type}` - Validation errors by type
- `bhyt_coverage_calculations_total` - Coverage calculations performed

**Histograms (approximated as gauges):**
- `bhyt_coverage_p50_duration_ms` - Coverage calculation p50 latency
- `bhyt_coverage_p95_duration_ms` - Coverage calculation p95 latency
- `bhyt_coverage_p99_duration_ms` - Coverage calculation p99 latency
- `bhyt_coverage_avg_duration_ms` - Average coverage calculation duration

**Usage in code:**
```go
import "github.com/tqvdang/physioflow/apps/api/internal/metrics"

// Record successful validation
metrics.RecordBHYTValidation("valid", "HN")

// Record validation error
metrics.RecordValidationError("invalid_prefix")

// Record coverage calculation duration
start := time.Now()
// ... perform calculation ...
metrics.RecordCoverageCalculation(time.Since(start))
```

#### 2. Outcome Measures

**Counters:**
- `outcome_measures_recorded_total{measure_type, phase}` - Measures recorded
- `outcome_progress_calculations_total` - Progress calculations performed

**Gauges:**
- `outcome_progress_avg_duration_ms` - Average progress calculation time
- `outcome_progress_p95_duration_ms` - p95 progress calculation time

**Usage:**
```go
// Record outcome measure
metrics.RecordOutcomeMeasure("NPRS", "initial")

// Record progress calculation
start := time.Now()
// ... calculate progress ...
metrics.RecordOutcomeProgressCalculation(time.Since(start))
```

#### 3. Billing

**Counters:**
- `billing_invoices_created_total{status}` - Invoices by status
- `billing_payments_recorded_total{payment_method}` - Payments by method
- `billing_calculation_errors_total` - Calculation errors

**Usage:**
```go
// Record invoice creation
metrics.RecordBillingInvoice("pending")

// Record payment
metrics.RecordBillingPayment("cash")

// Record calculation error
metrics.RecordBillingCalculationError()
```

#### 4. Clinical Protocols

**Counters:**
- `protocols_assigned_total{protocol_id}` - Protocol assignments
- `protocols_completed_total` - Completed protocols

**Usage:**
```go
metrics.RecordProtocolAssignment("shoulder-impingement-phase1")
metrics.RecordProtocolCompletion()
```

#### 5. Discharge Planning

**Counters:**
- `discharge_summaries_generated_total` - Summaries generated
- `discharge_pdf_generations_total` - PDF generations

**Gauges:**
- `discharge_pdf_avg_duration_ms` - Average PDF generation time
- `discharge_pdf_p95_duration_ms` - p95 PDF generation time

**Usage:**
```go
metrics.RecordDischargeSummary()

start := time.Now()
// ... generate PDF ...
metrics.RecordDischargePDFGeneration(time.Since(start))
```

#### 6. Vietnamese Medical Terms

**Counters:**
- `medical_terms_search_total` - Total searches

**Gauges:**
- `medical_terms_search_avg_duration_ms` - Average search time
- `medical_terms_search_p95_duration_ms` - p95 search time

**Usage:**
```go
start := time.Now()
// ... perform search ...
metrics.RecordMedicalTermsSearch(time.Since(start))
```

#### 7. API Request Metrics

**Counters:**
- `api_requests_total{endpoint, method, status}` - Request counts

**Gauges (per endpoint:method):**
- `api_request_duration_avg_ms` - Average response time
- `api_request_duration_p50_ms` - p50 response time
- `api_request_duration_p95_ms` - p95 response time
- `api_request_duration_p99_ms` - p99 response time

**Automatic recording:**
These metrics are automatically recorded by the Logger middleware for all requests.

### Metrics Endpoint

Metrics are exposed at `/metrics` with two formats:

1. **JSON format** (default): `GET /metrics`
   ```json
   {
     "bhyt_validations_total": {
       "valid:HN": 1234,
       "valid:HCM": 567
     },
     "bhyt_coverage_avg_duration_ms": 45.2
   }
   ```

2. **Prometheus format**: `GET /metrics?format=prometheus`
   ```
   # HELP bhyt_validations_total Total number of BHYT validations
   # TYPE bhyt_validations_total counter
   bhyt_validations_total{status="valid",prefix_code="HN"} 1234
   ```

## Grafana Dashboards

### 1. PhysioFlow PT Features Overview
**UID:** `physioflow-pt-features`

Panels:
- BHYT Validation Rate (by status)
- BHYT Coverage Calculation Latency (p50/p95/p99)
- Outcome Measures by Type (pie chart)
- Billing Invoice Creation Rate
- Protocol Assignment Rate
- Discharge Summary Generation Latency
- Medical Term Search Rate & Latency
- API Error Rates by Endpoint

**Use case:** High-level view of all Vietnamese PT features

### 2. BHYT Insurance Detail
**UID:** `physioflow-bhyt-detail`

Panels:
- Validation Rate by Prefix Code
- Validation Error Rate (gauge)
- Total BHYT Validations (stat)
- Coverage Calculation Latency (all percentiles)
- Validation Errors by Type (pie chart)
- Invalid Card Attempts (rate)
- Coverage Calculation Throughput

**Use case:** Deep dive into BHYT insurance feature performance

### 3. Performance Metrics
**UID:** `physioflow-performance`

Panels:
- API Response Time Overall (p50/p95/p99)
- API p95 Latency by Endpoint
- Outcome Measures Calculation Latency
- Medical Term Search Latency
- Discharge PDF Generation Latency
- Request Throughput by Status
- Top 10 Slowest Endpoints (bar chart)

**Use case:** Performance troubleshooting and optimization

### 4. Error Dashboard
**UID:** `physioflow-errors`

Panels:
- Error Rate by Endpoint (timeseries)
- Overall 5xx Error Rate (gauge)
- Overall 4xx Error Rate (gauge)
- Billing Calculation Errors
- BHYT Validation Errors by Type
- Error Types Breakdown (pie chart)
- Recent Error Logs (from Loki)

**Use case:** Error monitoring and debugging

### 5. Database Performance
**UID:** `physioflow-database`

Panels:
- Query Execution Time by Table
- Connection Pool Usage
- Slow Query Count
- Table Activity

**Use case:** Database performance monitoring

## Prometheus Alerts

### BHYT Insurance Alerts

**BHYTHighErrorRate**
- Threshold: >5% error rate for 5 minutes
- Severity: warning
- Description: BHYT validation error rate exceeds threshold

**BHYTCoverageCalculationSlow**
- Threshold: p95 >1000ms for 5 minutes
- Severity: warning
- Description: Coverage calculations are taking too long

### Outcome Measures Alerts

**OutcomeMeasuresSlowCalculation**
- Threshold: p95 >1000ms for 5 minutes
- Severity: warning
- Description: Progress calculations are slow

### Billing Alerts

**BillingCalculationErrors**
- Threshold: >1% error rate for 5 minutes
- Severity: critical
- Description: High billing calculation error rate

### Discharge Alerts

**DischargePDFGenerationSlow**
- Threshold: p95 >5000ms for 5 minutes
- Severity: warning
- Description: PDF generation is taking too long

### Medical Terms Alerts

**MedicalTermSearchSlow**
- Threshold: p95 >500ms for 5 minutes
- Severity: warning
- Description: Medical term searches are slow

### API Alerts

**APIHighErrorRate**
- Threshold: >5% 5xx error rate for 5 minutes
- Severity: critical
- Description: High API server error rate

**APIHighLatency**
- Threshold: p95 >2s for 5 minutes
- Severity: warning
- Description: API response times are high

**APIHighLatencyP99**
- Threshold: p99 >3s for 10 minutes
- Severity: warning
- Description: API p99 latency is very high

**APIServiceDown**
- Threshold: API unreachable for 1 minute
- Severity: critical
- Description: PhysioFlow API is down

### Database Alerts

**DatabaseConnectionPoolExhausted**
- Threshold: >90% connection usage for 5 minutes
- Severity: critical
- Description: Database connection pool near exhaustion

**DatabaseSlowQueries**
- Threshold: Query execution >1s for 10 minutes
- Severity: warning
- Description: Database has slow queries

### Infrastructure Alerts

**HighMemoryUsage**
- Threshold: >90% memory usage for 5 minutes
- Severity: warning
- Description: High memory usage on pod

**HighCPUUsage**
- Threshold: >80% CPU usage for 10 minutes
- Severity: warning
- Description: High CPU usage on pod

### Cache Alerts

**RedisCacheDown**
- Threshold: Redis unreachable for 2 minutes
- Severity: critical
- Description: Redis cache is down

**CacheHitRateLow**
- Threshold: <80% hit rate for 10 minutes
- Severity: warning
- Description: Low Redis cache hit rate

### Security Alerts

**HighAuthenticationFailureRate**
- Threshold: >10% 401 errors for 5 minutes
- Severity: warning
- Description: High authentication failure rate

**SuspiciousActivityDetected**
- Threshold: >10 forbidden requests/sec for 5 minutes
- Severity: critical
- Description: Suspicious activity detected

### Protocol Alerts

**ProtocolAssignmentFailureRate**
- Threshold: >5% error rate for 5 minutes
- Severity: warning
- Description: High protocol assignment failure rate

## Structured Logging

### Log Format

All logs are JSON-formatted using zerolog:

```json
{
  "level": "info",
  "time": 1707654321,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "uri": "/api/v1/patients/123/insurance/validate",
  "path": "/api/v1/patients/:patientId/insurance/validate",
  "remote_addr": "192.168.10.100",
  "status": 200,
  "size": 1024,
  "latency": 45000000,
  "latency_ms": 45.0,
  "user_agent": "Mozilla/5.0...",
  "user_id": "user-uuid-123",
  "patient_id": "123",
  "operation": "POST /api/v1/patients/:patientId/insurance/validate",
  "feature": "bhyt_insurance",
  "message": "http request"
}
```

### Log Levels

- **DEBUG**: Development debugging (disabled in production)
- **INFO**: Normal operations, all HTTP requests
- **WARN**: Warnings (4xx errors, slow requests)
- **ERROR**: Errors (5xx errors, exceptions)

### Feature Tagging

All Vietnamese PT feature endpoints are automatically tagged with a `feature` field:

- `bhyt_insurance` - BHYT insurance endpoints
- `billing` - Billing endpoints
- `bhyt_claims` - BHYT claim submission
- `outcome_measures` - Outcome measures
- `clinical_protocols` - Clinical protocols
- `discharge_planning` - Discharge planning
- `medical_terms` - Medical terms search
- `assessments` - ROM/MMT assessments
- `special_tests` - Special tests library
- `reports` - PDF report generation

### Contextual Fields

Automatically added to logs:
- `request_id` - Unique request identifier
- `user_id` - Authenticated user ID
- `patient_id` - Patient ID (when applicable, for PHI audit)
- `slow_request` - Boolean flag for requests >500ms

### Querying Logs in Loki

**All errors:**
```
{app="physioflow-api"} |= "level=error"
```

**BHYT insurance errors:**
```
{app="physioflow-api"} |= "feature=bhyt_insurance" |= "level=error"
```

**Slow requests:**
```
{app="physioflow-api"} |= "slow_request=true"
```

**Patient-specific audit trail:**
```
{app="physioflow-api"} |= "patient_id=123"
```

**Requests by user:**
```
{app="physioflow-api"} |= "user_id=user-uuid-123"
```

## Deployment

### Prerequisites

1. Prometheus installed in K3s cluster
2. Grafana installed in K3s cluster
3. Loki installed in K3s cluster

### Deploy Monitoring Configuration

```bash
# From repository root
cd infrastructure/homelab/k8s

# Apply Grafana dashboards
kubectl apply -f base/configmap-grafana-dashboards.yaml -n monitoring

# Apply Prometheus alert rules
kubectl apply -f base/prometheusrule-physioflow.yaml -n monitoring

# Restart Grafana to load new dashboards
kubectl rollout restart deployment/grafana -n monitoring

# Restart Prometheus to load new alert rules
kubectl rollout restart statefulset/prometheus -n monitoring
```

### Verify Deployment

```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check Grafana dashboards
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit http://localhost:3000/dashboards

# Check Prometheus alerts
# Visit http://localhost:9090/alerts

# Check metrics endpoint
kubectl port-forward -n physioflow-dev svc/physioflow-api 7011:80
curl http://localhost:7011/metrics?format=prometheus
```

### Access Dashboards

1. **Development**: https://grafana.trancloud.work/d/physioflow-pt-features
2. **Staging**: https://grafana.trancloud.work/d/physioflow-pt-features
3. **Production**: https://grafana.trancloud.work/d/physioflow-pt-features

Use Grafana's environment selector to switch between dev/staging/prod data sources.

## Runbooks

Alert runbooks are available at: https://wiki.trancloud.work/physioflow/runbooks/

Each alert includes a `runbook_url` annotation linking to detailed troubleshooting steps.

## Monitoring Best Practices

1. **Set up alerting channels**: Configure Grafana to send alerts to Slack/email
2. **Review dashboards regularly**: Check dashboards daily during initial rollout
3. **Tune alert thresholds**: Adjust thresholds based on real usage patterns
4. **Monitor resource usage**: Watch CPU/memory to prevent pod evictions
5. **Correlate metrics with logs**: Use request_id to trace errors
6. **Track SLOs**: Define and monitor Service Level Objectives for PT features
7. **Regular dashboard reviews**: Schedule weekly reviews of error dashboards

## Troubleshooting

### Metrics not appearing

1. Check API is exposing metrics endpoint:
   ```bash
   kubectl port-forward -n physioflow-dev svc/physioflow-api 7011:80
   curl http://localhost:7011/metrics?format=prometheus
   ```

2. Verify Prometheus is scraping the API:
   ```bash
   # Check Prometheus targets
   kubectl port-forward -n monitoring svc/prometheus 9090:9090
   # Visit http://localhost:9090/targets
   # Look for physioflow-api target
   ```

3. Check Prometheus service discovery:
   ```yaml
   # Ensure ServiceMonitor or scrape config exists
   kubectl get servicemonitor -n physioflow-dev
   ```

### Dashboards not loading

1. Verify ConfigMap is applied:
   ```bash
   kubectl get configmap grafana-dashboards -n monitoring
   ```

2. Check Grafana logs:
   ```bash
   kubectl logs -n monitoring deployment/grafana
   ```

3. Manually import dashboard JSON from ConfigMap

### Alerts not firing

1. Check PrometheusRule is applied:
   ```bash
   kubectl get prometheusrule physioflow-alerts -n monitoring
   ```

2. Verify alert is loaded in Prometheus:
   ```bash
   # Visit http://localhost:9090/alerts
   ```

3. Check alert threshold is actually exceeded

### Logs not appearing in Loki

1. Verify Loki is running:
   ```bash
   kubectl get pods -n monitoring -l app=loki
   ```

2. Check Promtail is shipping logs:
   ```bash
   kubectl logs -n monitoring daemonset/promtail
   ```

3. Verify log labels match Loki query:
   ```bash
   # Check pod labels
   kubectl get pods -n physioflow-dev -o wide --show-labels
   ```

## Performance Impact

Metrics collection has minimal performance impact:
- Memory: ~5MB per API pod for metric storage
- CPU: <1% overhead for atomic operations
- Latency: <0.1ms per request for metric recording

Logging overhead:
- Memory: Zerolog uses minimal allocations
- CPU: JSON marshaling ~0.1ms per log line
- Disk I/O: Handled by Kubernetes log rotation

## Future Enhancements

1. **OpenTelemetry integration**: Replace custom metrics with OTEL
2. **Distributed tracing**: Add Jaeger for request tracing
3. **Custom business metrics**: Track clinical outcomes, patient satisfaction
4. **Anomaly detection**: Use ML to detect unusual patterns
5. **Capacity planning**: Predict resource needs based on growth
6. **Cost attribution**: Track cost per feature/tenant
7. **Real User Monitoring (RUM)**: Add frontend performance tracking
8. **Synthetic monitoring**: Proactive uptime checks
