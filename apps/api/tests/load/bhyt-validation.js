// BHYT Insurance Card Validation Load Test
// Target: p95 < 100ms, 100 req/s

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const validationDuration = new Trend('validation_duration', true);

// Performance thresholds
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Stay at 100 users (100 req/s)
    { duration: '30s', target: 150 },  // Peak at 150 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],       // p95 < 100ms
    http_req_failed: ['rate<0.01'],          // < 1% errors
    'errors': ['rate<0.01'],                 // < 1% application errors
    'validation_duration': ['p(95)<100'],    // Validation logic < 100ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:7011';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Sample BHYT card numbers (valid format)
const BHYT_CARD_NUMBERS = [
  'HC1-2024-12345-67890',
  'HC2-2025-23456-78901',
  'HC3-2024-34567-89012',
  'HC4-2025-45678-90123',
  'HC5-2024-56789-01234',
  'HS1-2024-12345-67890',
  'HS2-2025-23456-78901',
  'TE1-2024-34567-89012',
  'TE2-2025-45678-90123',
  'NN1-2024-56789-01234',
];

// Sample patient IDs
const PATIENT_IDS = [
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
];

export default function () {
  const patientId = PATIENT_IDS[Math.floor(Math.random() * PATIENT_IDS.length)];
  const cardNumber = BHYT_CARD_NUMBERS[Math.floor(Math.random() * BHYT_CARD_NUMBERS.length)];

  const payload = JSON.stringify({
    cardNumber: cardNumber,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/patients/${patientId}/insurance/validate`,
    payload,
    params
  );
  const duration = Date.now() - startTime;

  validationDuration.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has validation result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('isValid');
      } catch {
        return false;
      }
    },
    'validation successful': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.isValid === true || body.isValid === false;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Simulate realistic user behavior (1-2 second think time)
  sleep(Math.random() * 1 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'bhyt-validation-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `
${indent}BHYT Validation Load Test Results
${indent}=====================================

${indent}Requests:
${indent}  Total: ${data.metrics.http_reqs.values.count}
${indent}  Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
${indent}  Failed: ${data.metrics.http_req_failed.values.rate * 100}%

${indent}Response Times:
${indent}  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
${indent}  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
${indent}  p90: ${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms
${indent}  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

${indent}Thresholds:
${indent}  p95 < 100ms: ${data.metrics.http_req_duration.values['p(95)'] < 100 ? 'PASS' : 'FAIL'}
${indent}  Error rate < 1%: ${data.metrics.http_req_failed.values.rate < 0.01 ? 'PASS' : 'FAIL'}
`;

  return summary;
}
