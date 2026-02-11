// Billing Calculation Load Test
// Target: p95 < 200ms

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const calculationDuration = new Trend('calculation_duration', true);

// Performance thresholds
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 150 },  // Peak at 150 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],       // p95 < 200ms
    http_req_failed: ['rate<0.01'],          // < 1% errors
    'errors': ['rate<0.01'],                 // < 1% application errors
    'calculation_duration': ['p(95)<200'],   // Calculation logic < 200ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:7011';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Sample patient IDs (some with BHYT insurance, some without)
const PATIENTS_WITH_INSURANCE = [
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
];

const PATIENTS_WITHOUT_INSURANCE = [
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
];

// Service code combinations (varying complexity)
const SERVICE_CODE_SCENARIOS = [
  {
    name: 'single_service',
    codes: ['PT-EVAL-INIT'],
  },
  {
    name: 'typical_session',
    codes: ['PT-THER-MAN', 'PT-THER-THER-EX', 'PT-MOD-HEAT'],
  },
  {
    name: 'complex_session',
    codes: ['PT-EVAL-INIT', 'PT-THER-MAN', 'PT-THER-THER-EX', 'PT-THER-NDT', 'PT-MOD-HEAT', 'PT-MOD-ESTIM'],
  },
  {
    name: 'multi_modality',
    codes: ['PT-THER-MAN', 'PT-THER-THER-EX', 'PT-MOD-HEAT', 'PT-MOD-ICE', 'PT-MOD-ESTIM', 'PT-MOD-US'],
  },
  {
    name: 'evaluation_treatment',
    codes: ['PT-EVAL-INIT', 'PT-EVAL-RE', 'PT-THER-MAN', 'PT-THER-THER-EX'],
  },
];

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  // Randomly select patient (70% with insurance, 30% without)
  let patientId;
  if (Math.random() < 0.7) {
    patientId = PATIENTS_WITH_INSURANCE[Math.floor(Math.random() * PATIENTS_WITH_INSURANCE.length)];
  } else {
    patientId = PATIENTS_WITHOUT_INSURANCE[Math.floor(Math.random() * PATIENTS_WITHOUT_INSURANCE.length)];
  }

  // Randomly select service code scenario
  const scenario = SERVICE_CODE_SCENARIOS[Math.floor(Math.random() * SERVICE_CODE_SCENARIOS.length)];

  const payload = JSON.stringify({
    serviceCodes: scenario.codes,
  });

  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/patients/${patientId}/billing/calculate`,
    payload,
    params
  );
  const duration = Date.now() - startTime;

  calculationDuration.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'response time < 400ms': (r) => r.timings.duration < 400,
    'has calculation result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('totalAmount') &&
               body.hasOwnProperty('insuranceAmount') &&
               body.hasOwnProperty('copayAmount');
      } catch {
        return false;
      }
    },
    'has line items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.lineItems) &&
               body.lineItems.length === scenario.codes.length;
      } catch {
        return false;
      }
    },
    'correct calculations': (r) => {
      try {
        const body = JSON.parse(r.body);
        // Verify that total = insurance + copay
        const calculatedTotal = body.insuranceAmount + body.copayAmount;
        const diff = Math.abs(body.totalAmount - calculatedTotal);
        return diff < 0.01; // Allow for floating point rounding
      } catch {
        return false;
      }
    },
    'has coverage percent': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('coveragePercent') &&
               body.coveragePercent >= 0 &&
               body.coveragePercent <= 100;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Also test creating invoice (25% of the time)
  if (Math.random() < 0.25 && res.status === 200) {
    try {
      const calculation = JSON.parse(res.body);

      const invoicePayload = JSON.stringify({
        serviceCodes: scenario.codes,
        notes: 'Load test invoice',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      const invoiceRes = http.post(
        `${BASE_URL}/api/v1/patients/${patientId}/billing/invoice`,
        invoicePayload,
        params
      );

      check(invoiceRes, {
        'invoice created': (r) => r.status === 201,
        'invoice has number': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.hasOwnProperty('invoiceNumber');
          } catch {
            return false;
          }
        },
      });
    } catch {
      // Ignore parse errors
    }
  }

  // Simulate realistic user behavior (1-3 second think time)
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];

  return {
    'stdout': textSummary(data),
    'billing-calculation-results.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];

  return `
Billing Calculation Load Test Results
======================================

Requests:
  Total: ${data.metrics.http_reqs.values.count}
  Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
  Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

Response Times:
  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
  p90: ${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms
  p95: ${p95.toFixed(2)}ms
  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Thresholds:
  p95 < 200ms: ${p95 < 200 ? 'PASS ✓' : 'FAIL ✗'}
  Error rate < 1%: ${data.metrics.http_req_failed.values.rate < 0.01 ? 'PASS ✓' : 'FAIL ✗'}

Notes:
  - Tests with and without insurance coverage
  - Tests varying service code complexity (1-6 services)
  - Tests validate correct calculations
  - Tests include invoice creation (25% of requests)
`;
}
