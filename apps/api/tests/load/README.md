# Load Testing Suite

Performance and load tests for PhysioFlow API using K6.

## Overview

This suite tests critical API endpoints against their performance targets:

| Endpoint | Target p95 | Target RPS | Test File |
|----------|-----------|------------|-----------|
| BHYT Validation | < 100ms | 100 req/s | `bhyt-validation.js` |
| Outcome Progress | < 500ms | 50 req/s | `outcome-measures.js` |
| Medical Term Search | < 200ms | 200 req/s | `medical-term-search.js` |
| Discharge PDF | < 3s | 10 req/s | `discharge-pdf.js` |
| Billing Calculation | < 200ms | 100 req/s | `billing-calculation.js` |

## Prerequisites

1. Install K6:
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

2. Start the API server:
   ```bash
   # From repository root
   make dev-local
   # or
   cd apps/api && go run cmd/api/main.go
   ```

3. Seed test data:
   ```bash
   make seed
   ```

## Running Tests

### Run Individual Test

```bash
cd apps/api/tests/load

# BHYT validation test
k6 run bhyt-validation.js

# Outcome measures test
k6 run outcome-measures.js

# Medical term search test
k6 run medical-term-search.js

# Discharge PDF generation test
k6 run discharge-pdf.js

# Billing calculation test
k6 run billing-calculation.js
```

### Run with Custom API URL

```bash
k6 run --env API_URL=http://localhost:7011 bhyt-validation.js
```

### Run with Authentication Token

```bash
k6 run --env API_TOKEN=your-token-here bhyt-validation.js
```

### Run All Tests

```bash
./run-all-load-tests.sh
```

### Run with Metrics Export

Export metrics to InfluxDB for visualization:

```bash
k6 run --out influxdb=http://localhost:8086/k6 bhyt-validation.js
```

Export to JSON:

```bash
k6 run --out json=results.json bhyt-validation.js
```

## Test Configuration

Each test uses staged load testing with ramp-up and ramp-down periods:

### BHYT Validation (bhyt-validation.js)
- 30s: Ramp up to 50 users
- 1m: Sustain 100 users
- 30s: Peak at 150 users
- 30s: Ramp down to 0

### Outcome Measures (outcome-measures.js)
- 30s: Ramp up to 25 users
- 1m: Sustain 50 users
- 30s: Peak at 75 users
- 30s: Ramp down to 0

### Medical Term Search (medical-term-search.js)
- 30s: Ramp up to 100 users
- 1m: Sustain 200 users
- 30s: Peak at 300 users
- 30s: Ramp down to 0

### Discharge PDF (discharge-pdf.js)
- 30s: Ramp up to 5 users
- 1m: Sustain 10 users
- 30s: Peak at 15 users
- 30s: Ramp down to 0

### Billing Calculation (billing-calculation.js)
- 30s: Ramp up to 50 users
- 1m: Sustain 100 users
- 30s: Peak at 150 users
- 30s: Ramp down to 0

## Interpreting Results

### Key Metrics

- **http_req_duration**: Total request duration (includes network time)
- **http_req_waiting**: Time waiting for response (excludes network)
- **http_req_failed**: Percentage of failed requests
- **Custom metrics**: Application-specific timing

### Success Criteria

Tests pass if:
1. p95 response time < target threshold
2. Error rate < 1%
3. All check assertions pass

### Example Output

```
✓ status is 200
✓ response time < 100ms
✓ has validation result

checks.........................: 100.00% ✓ 3000 ✗ 0
data_received..................: 1.2 MB  40 kB/s
data_sent......................: 500 kB  17 kB/s
http_req_blocked...............: avg=1.2ms   min=0s    med=1ms    max=10ms   p(90)=2ms    p(95)=3ms
http_req_duration..............: avg=45ms    min=10ms  med=40ms   max=150ms  p(90)=80ms   p(95)=95ms
  { expected_response:true }...: avg=45ms    min=10ms  med=40ms   max=150ms  p(90)=80ms   p(95)=95ms
http_req_failed................: 0.00%   ✓ 0    ✗ 3000
http_req_receiving.............: avg=0.5ms   min=0s    med=0.4ms  max=5ms    p(90)=1ms    p(95)=1.5ms
http_req_sending...............: avg=0.2ms   min=0s    med=0.1ms  max=2ms    p(90)=0.5ms  p(95)=0.8ms
http_req_tls_handshaking.......: avg=0s      min=0s    med=0s     max=0s     p(90)=0s     p(95)=0s
http_req_waiting...............: avg=44.3ms  min=9.5ms med=39.5ms max=148ms  p(90)=79ms   p(95)=94ms
http_reqs......................: 3000    100/s
iteration_duration.............: avg=1.05s   min=1s    med=1.04s  max=1.2s   p(90)=1.08s  p(95)=1.1s
iterations.....................: 3000    100/s
vus............................: 100     min=0  max=100
vus_max........................: 100     min=100 max=100
```

### Thresholds

If a threshold fails, K6 exits with non-zero status:

```
✗ http_req_duration............: avg=250ms  p(95)=450ms ✗ { p(95)<200ms }
```

This indicates the API didn't meet the performance target.

## Troubleshooting

### High Response Times

1. Check database query performance:
   ```bash
   cd infrastructure/db
   psql -U emr -d physioflow -f tests/database-queries.sql
   ```

2. Check for N+1 queries:
   ```bash
   cd apps/api
   go test -v ./tests/performance
   ```

3. Enable API debug logging:
   ```bash
   LOG_LEVEL=debug go run cmd/api/main.go
   ```

### Connection Errors

1. Verify API is running:
   ```bash
   curl http://localhost:7011/health
   ```

2. Check port conflicts:
   ```bash
   lsof -i :7011
   ```

3. Verify database connection:
   ```bash
   make psql
   ```

### Out of Memory

If K6 runs out of memory with many VUs:

1. Reduce max VUs in test file
2. Increase system resources
3. Run tests sequentially instead of in parallel

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run load tests
  run: |
    cd apps/api/tests/load
    k6 run --quiet --no-color bhyt-validation.js
    k6 run --quiet --no-color outcome-measures.js
    k6 run --quiet --no-color medical-term-search.js
```

### Performance Regression Detection

Compare results over time:

```bash
# Save baseline
k6 run --out json=baseline.json bhyt-validation.js

# Compare after changes
k6 run --out json=current.json bhyt-validation.js
python compare-results.py baseline.json current.json
```

## Advanced Usage

### Custom Scenarios

Modify the `options.stages` array in each test file:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 200 },  // Simulate 200 users for 2 minutes
  ],
};
```

### Smoke Testing

Quick test with minimal load:

```javascript
export const options = {
  vus: 1,
  duration: '30s',
};
```

### Stress Testing

Find breaking point:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '10m', target: 400 },
  ],
};
```

### Spike Testing

Test recovery from sudden load:

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 100 },  // Normal load
    { duration: '1m', target: 1000 },  // Spike
    { duration: '3m', target: 100 },   // Recovery
  ],
};
```

## Related Documentation

- [K6 Documentation](https://k6.io/docs/)
- [Database Performance Tests](../../../infrastructure/db/tests/database-queries.sql)
- [N+1 Query Detection](../performance/n_plus_one_test.go)
- [API Integration Tests](../integration/README.md)
