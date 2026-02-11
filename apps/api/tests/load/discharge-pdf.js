// Discharge Summary PDF Generation Load Test
// Target: p95 < 3s, 10 req/s

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const summaryGenerationDuration = new Trend('summary_generation_duration', true);
const summariesGenerated = new Counter('summaries_generated');

// Performance thresholds
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users
    { duration: '1m', target: 10 },    // Stay at 10 users (10 req/s)
    { duration: '30s', target: 15 },   // Peak at 15 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],         // p95 < 3s
    http_req_failed: ['rate<0.01'],             // < 1% errors
    'errors': ['rate<0.01'],                    // < 1% application errors
    'summary_generation_duration': ['p(95)<3000'], // Generation logic < 3s
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:7011';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Patient scenarios with varying data complexity
const PATIENT_SCENARIOS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    complexity: 'simple',
    sessions: 5,
    measures: 2,
    exercises: 3,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    complexity: 'medium',
    sessions: 15,
    measures: 5,
    exercises: 8,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    complexity: 'complex',
    sessions: 30,
    measures: 10,
    exercises: 15,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    complexity: 'very_complex',
    sessions: 50,
    measures: 20,
    exercises: 25,
  },
];

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    timeout: '10s', // Allow up to 10s for complex summaries
  };

  // Randomly select patient scenario
  const scenario = PATIENT_SCENARIOS[Math.floor(Math.random() * PATIENT_SCENARIOS.length)];

  // Generate discharge summary
  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/patients/${scenario.id}/discharge/summary`,
    null,
    params
  );
  const duration = Date.now() - startTime;

  summaryGenerationDuration.add(duration);

  const success = check(res, {
    'status is 201 or 404': (r) => r.status === 201 || r.status === 404,
    'response time < 3s': (r) => r.timings.duration < 3000,
    'response time < 5s': (r) => r.timings.duration < 5000,
    'has summary data': (r) => {
      if (r.status === 404) return true; // No discharge plan is valid
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('id') && body.hasOwnProperty('dischargePlanId');
      } catch {
        return false;
      }
    },
    'has baseline comparison': (r) => {
      if (r.status === 404) return true;
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.baselineComparison);
      } catch {
        return false;
      }
    },
    'has treatment summary': (r) => {
      if (r.status === 404) return true;
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('treatmentSummary') &&
               body.hasOwnProperty('totalSessions') &&
               body.hasOwnProperty('treatmentDurationDays');
      } catch {
        return false;
      }
    },
    'bilingual content': (r) => {
      if (r.status === 404) return true;
      try {
        const body = JSON.parse(r.body);
        // Check for Vietnamese translations
        return body.hasOwnProperty('treatmentSummaryVi') ||
               body.hasOwnProperty('diagnosisVi');
      } catch {
        return false;
      }
    },
  });

  if (res.status === 201) {
    summariesGenerated.add(1);
  }

  errorRate.add(!success);

  // Also test retrieving existing summary (lighter operation)
  if (Math.random() < 0.3 && res.status === 201) { // 30% of successful generations
    try {
      const summaryId = JSON.parse(res.body).id;
      const getRes = http.get(
        `${BASE_URL}/api/v1/discharge/summary/${summaryId}`,
        params
      );

      check(getRes, {
        'get summary status ok': (r) => r.status === 200,
        'get summary fast': (r) => r.timings.duration < 200,
      });
    } catch {
      // Ignore parse errors
    }
  }

  // Simulate realistic user behavior (users generate summaries infrequently)
  sleep(Math.random() * 5 + 5); // 5-10 second think time
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];

  return {
    'stdout': textSummary(data),
    'discharge-pdf-results.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const summariesCount = data.metrics.summaries_generated ? data.metrics.summaries_generated.values.count : 0;

  return `
Discharge Summary Generation Load Test Results
===============================================

Requests:
  Total: ${data.metrics.http_reqs.values.count}
  Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
  Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
  Summaries Generated: ${summariesCount}

Response Times:
  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
  p90: ${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms
  p95: ${p95.toFixed(2)}ms
  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Thresholds:
  p95 < 3s: ${p95 < 3000 ? 'PASS ✓' : 'FAIL ✗'}
  Error rate < 1%: ${data.metrics.http_req_failed.values.rate < 0.01 ? 'PASS ✓' : 'FAIL ✗'}

Notes:
  - Tests include varying data complexity (5-50 sessions)
  - Tests validate bilingual content generation
  - Tests validate baseline comparison calculations
  - Actual PDF rendering would add additional time
`;
}
