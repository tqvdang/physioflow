# PhysioFlow Metrics Quick Reference

## Metrics Endpoint

**Local Development**: `http://localhost:7011/metrics`
**Homelab Dev**: `https://physioflow-dev.trancloud.work/api/metrics`

### Formats

```bash
# JSON (default)
curl http://localhost:7011/metrics

# Prometheus
curl http://localhost:7011/metrics?format=prometheus
```

## Feature Metrics Summary

### BHYT Insurance (7 metrics)

```promql
# Validation rate by status and prefix code
bhyt_validations_total{status="valid",prefix_code="HN"}

# Validation errors by type
bhyt_validation_errors_total{error_type="invalid_prefix"}

# Coverage calculation performance
bhyt_coverage_calculations_total
bhyt_coverage_p95_duration_ms
```

**Record in code**:
```go
metrics.RecordBHYTValidation("valid", "HN")
metrics.RecordValidationError("invalid_checksum")
metrics.RecordCoverageCalculation(time.Since(start))
```

### Outcome Measures (5 metrics)

```promql
# Measures recorded by type and phase
outcome_measures_recorded_total{measure_type="NPRS",phase="initial"}

# Progress calculation performance
outcome_progress_calculations_total
outcome_progress_p95_duration_ms
```

**Record in code**:
```go
metrics.RecordOutcomeMeasure("NPRS", "initial")
metrics.RecordOutcomeProgressCalculation(time.Since(start))
```

### Billing (3 metrics)

```promql
# Invoices by status
billing_invoices_created_total{status="pending"}

# Payments by method
billing_payments_recorded_total{payment_method="cash"}

# Calculation errors
billing_calculation_errors_total
```

**Record in code**:
```go
metrics.RecordBillingInvoice("pending")
metrics.RecordBillingPayment("cash")
metrics.RecordBillingCalculationError()
```

### Clinical Protocols (2 metrics)

```promql
# Protocol assignments
protocols_assigned_total{protocol_id="shoulder-impingement-phase1"}

# Completed protocols
protocols_completed_total
```

**Record in code**:
```go
metrics.RecordProtocolAssignment("shoulder-impingement-phase1")
metrics.RecordProtocolCompletion()
```

### Discharge Planning (4 metrics)

```promql
# Summaries generated
discharge_summaries_generated_total

# PDF generation performance
discharge_pdf_generations_total
discharge_pdf_p95_duration_ms
```

**Record in code**:
```go
metrics.RecordDischargeSummary()
metrics.RecordDischargePDFGeneration(time.Since(start))
```

### Vietnamese Medical Terms (3 metrics)

```promql
# Search volume
medical_terms_search_total

# Search performance
medical_terms_search_avg_duration_ms
medical_terms_search_p95_duration_ms
```

**Record in code**:
```go
metrics.RecordMedicalTermsSearch(time.Since(start))
```

### API Requests (9+ metrics)

```promql
# Request counts by endpoint, method, status
api_requests_total{endpoint="/api/v1/patients",method="GET",status="2xx"}

# Response times by endpoint
api_request_duration_p50_ms{endpoint="/api/v1/patients",method="GET"}
api_request_duration_p95_ms{endpoint="/api/v1/patients",method="GET"}
api_request_duration_p99_ms{endpoint="/api/v1/patients",method="GET"}
```

**Automatic recording**: Logger middleware records all API requests

## Dashboards

### 1. PT Features Overview
**URL**: https://grafana.trancloud.work/d/physioflow-pt-features
**UID**: `physioflow-pt-features`

High-level view of all 6 feature domains.

### 2. BHYT Insurance Detail
**URL**: https://grafana.trancloud.work/d/physioflow-bhyt-detail
**UID**: `physioflow-bhyt-detail`

Deep dive into BHYT validation and coverage calculations.

### 3. Performance Metrics
**URL**: https://grafana.trancloud.work/d/physioflow-performance
**UID**: `physioflow-performance`

API latency, throughput, and slowest endpoints.

### 4. Error Dashboard
**URL**: https://grafana.trancloud.work/d/physioflow-errors
**UID**: `physioflow-errors`

Error rates, error types, and recent error logs.

### 5. Database Performance
**URL**: https://grafana.trancloud.work/d/physioflow-database
**UID**: `physioflow-database`

Query performance, connection pool, slow queries.

## Prometheus Queries

### BHYT Error Rate
```promql
# Error rate by error type
sum by (error_type) (rate(bhyt_validation_errors_total[5m]))
/ sum(rate(bhyt_validations_total[5m]))
```

### API Latency by Endpoint
```promql
# p95 latency for all endpoints
topk(10, api_request_duration_p95_ms)
```

### Outcome Measures Progress Latency
```promql
# p95 latency for progress calculations
outcome_progress_p95_duration_ms
```

### Billing Error Rate
```promql
# Billing calculation error rate
rate(billing_calculation_errors_total[5m])
/ rate(billing_invoices_created_total[5m])
```

### Discharge PDF Performance
```promql
# PDF generation p95 latency
discharge_pdf_p95_duration_ms
```

### Medical Terms Search Performance
```promql
# Search p95 latency
medical_terms_search_p95_duration_ms
```

### API Overall Error Rate
```promql
# 5xx error rate
sum(rate(api_requests_total{status="5xx"}[5m]))
/ sum(rate(api_requests_total[5m]))
```

## Alerts

### Critical Alerts (page immediately)

- **APIServiceDown**: API unreachable for 1m
- **APIHighErrorRate**: >5% 5xx errors for 5m
- **BillingCalculationErrors**: >1% billing errors for 5m
- **DatabaseConnectionPoolExhausted**: >90% connection usage for 5m
- **RedisCacheDown**: Redis unreachable for 2m
- **SuspiciousActivityDetected**: >10 forbidden req/s for 5m

### Warning Alerts (investigate soon)

- **BHYTHighErrorRate**: >5% validation errors for 5m
- **BHYTCoverageCalculationSlow**: p95 >1000ms for 5m
- **OutcomeMeasuresSlowCalculation**: p95 >1000ms for 5m
- **DischargePDFGenerationSlow**: p95 >5000ms for 5m
- **MedicalTermSearchSlow**: p95 >500ms for 5m
- **APIHighLatency**: p95 >2s for 5m
- **APIHighLatencyP99**: p99 >3s for 10m
- **DatabaseSlowQueries**: queries >1s for 10m
- **HighMemoryUsage**: >90% memory for 5m
- **HighCPUUsage**: >80% CPU for 10m
- **CacheHitRateLow**: <80% cache hit rate for 10m
- **HighAuthenticationFailureRate**: >10% 401s for 5m
- **ProtocolAssignmentFailureRate**: >5% assignment errors for 5m

## Structured Logging

### Log Format (JSON)

```json
{
  "level": "info",
  "time": 1707654321,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "uri": "/api/v1/patients/123/insurance/validate",
  "status": 200,
  "latency_ms": 45.0,
  "user_id": "user-123",
  "patient_id": "123",
  "feature": "bhyt_insurance",
  "message": "http request"
}
```

### Feature Tags

- `bhyt_insurance` - BHYT insurance
- `billing` - Billing
- `bhyt_claims` - BHYT claims
- `outcome_measures` - Outcome measures
- `clinical_protocols` - Clinical protocols
- `discharge_planning` - Discharge planning
- `medical_terms` - Medical terms
- `assessments` - ROM/MMT assessments
- `special_tests` - Special tests
- `reports` - PDF reports

### Loki Queries

```logql
# All errors
{app="physioflow-api"} |= "level=error"

# BHYT errors
{app="physioflow-api"} |= "feature=bhyt_insurance" |= "level=error"

# Slow requests
{app="physioflow-api"} |= "slow_request=true"

# Patient audit trail
{app="physioflow-api"} |= "patient_id=123"

# User activity
{app="physioflow-api"} |= "user_id=user-123"

# Billing errors
{app="physioflow-api"} |= "feature=billing" |= "level=error"
```

## CLI Commands

### Local Testing

```bash
# Test metrics endpoint (JSON)
make test-metrics

# Test metrics endpoint (Prometheus)
make test-metrics-prometheus

# Show metrics status
make metrics-status
```

### Deployment

```bash
# Deploy monitoring to dev
make deploy-monitoring ENV=dev

# Deploy monitoring to staging
make deploy-monitoring ENV=staging

# Deploy monitoring to prod
make deploy-monitoring ENV=prod
```

### Verification

```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Port-forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit http://localhost:3000/dashboards

# Check API metrics
kubectl port-forward -n physioflow-dev svc/physioflow-api 7011:80
curl http://localhost:7011/metrics?format=prometheus
```

## SLO Targets

### BHYT Insurance
- Validation p95 latency: <100ms
- Coverage calculation p95 latency: <1000ms
- Error rate: <5%

### Outcome Measures
- Progress calculation p95 latency: <500ms
- Recording success rate: >99%

### Billing
- Calculation p95 latency: <200ms
- Error rate: <1%

### Medical Terms Search
- Search p95 latency: <200ms
- Availability: >99.9%

### Discharge Planning
- PDF generation p95 latency: <3000ms
- Success rate: >99%

### API Overall
- p95 latency: <1000ms
- p99 latency: <2000ms
- Error rate: <1%
- Availability: >99.9%

## Troubleshooting

### Metrics not appearing

1. Check API is running: `make status`
2. Test metrics endpoint: `make test-metrics`
3. Check Prometheus targets: http://prometheus:9090/targets
4. Verify ServiceMonitor exists: `kubectl get servicemonitor -n physioflow-dev`

### Dashboards not loading

1. Check ConfigMap: `kubectl get configmap grafana-dashboards -n monitoring`
2. Check Grafana logs: `kubectl logs -n monitoring deployment/grafana`
3. Restart Grafana: `kubectl rollout restart deployment/grafana -n monitoring`

### Alerts not firing

1. Check PrometheusRule: `kubectl get prometheusrule physioflow-alerts -n monitoring`
2. Verify in Prometheus: http://prometheus:9090/alerts
3. Restart Prometheus: `kubectl rollout restart deployment/prometheus -n monitoring`

### Logs not in Loki

1. Check Loki: `kubectl get pods -n monitoring -l app=loki`
2. Check Promtail: `kubectl logs -n monitoring daemonset/promtail`
3. Verify pod labels: `kubectl get pods -n physioflow-dev --show-labels`

## Performance Impact

- **Memory**: ~5MB per API pod
- **CPU**: <1% overhead
- **Latency**: <0.1ms per request
- **Disk**: Handled by K8s log rotation

**Total Impact**: Negligible

## Documentation

Full documentation: `/home/dang/dev/physioflow/infrastructure/homelab/k8s/MONITORING.md`

Implementation summary: `/home/dang/dev/physioflow/WAVE5_MONITORING_IMPLEMENTATION.md`
