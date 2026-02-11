// Outcome Measures Progress Calculation Load Test
// Target: p95 < 500ms, 50 req/s

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const progressCalculationDuration = new Trend('progress_calc_duration', true);
const dataPointsProcessed = new Counter('data_points_processed');

// Performance thresholds
export const options = {
  stages: [
    { duration: '30s', target: 25 },   // Ramp up to 25 users
    { duration: '1m', target: 50 },    // Stay at 50 users (50 req/s)
    { duration: '30s', target: 75 },   // Peak at 75 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],       // p95 < 500ms
    http_req_failed: ['rate<0.01'],          // < 1% errors
    'errors': ['rate<0.01'],                 // < 1% application errors
    'progress_calc_duration': ['p(95)<500'], // Calculation logic < 500ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:7011';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Sample patient IDs (some with few measures, some with many)
const PATIENT_SCENARIOS = [
  { id: '550e8400-e29b-41d4-a716-446655440001', dataPoints: 10 },   // Small dataset
  { id: '550e8400-e29b-41d4-a716-446655440002', dataPoints: 50 },   // Medium dataset
  { id: '550e8400-e29b-41d4-a716-446655440003', dataPoints: 100 },  // Large dataset
  { id: '550e8400-e29b-41d4-a716-446655440004', dataPoints: 200 },  // Very large dataset
];

// Measure types to test
const MEASURE_TYPES = [
  'vas',    // Visual Analog Scale
  'nrs',    // Numeric Rating Scale
  'ndi',    // Neck Disability Index
  'odi',    // Oswestry Disability Index
  'dash',   // Disabilities of Arm, Shoulder and Hand
  'lefs',   // Lower Extremity Functional Scale
  'koos',   // Knee Injury and Osteoarthritis Outcome Score
  'womac',  // Western Ontario and McMaster Universities Osteoarthritis Index
  'rom',    // Range of Motion
];

export default function () {
  // Randomly select patient scenario and measure type
  const scenario = PATIENT_SCENARIOS[Math.floor(Math.random() * PATIENT_SCENARIOS.length)];
  const measureType = MEASURE_TYPES[Math.floor(Math.random() * MEASURE_TYPES.length)];

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  // Test 1: Calculate progress for specific measure type
  const startTime = Date.now();
  const res = http.get(
    `${BASE_URL}/api/v1/patients/${scenario.id}/outcome-measures/progress?measureType=${measureType}`,
    params
  );
  const duration = Date.now() - startTime;

  progressCalculationDuration.add(duration);
  dataPointsProcessed.add(scenario.dataPoints);

  const success = check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'has progress data': (r) => {
      if (r.status === 404) return true; // No data is valid
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('currentScore');
      } catch {
        return false;
      }
    },
    'calculates change': (r) => {
      if (r.status === 404) return true;
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('change') && body.hasOwnProperty('trend');
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Test 2: Get trending data (more complex query)
  if (Math.random() < 0.3) { // 30% of requests also fetch trending
    const trendRes = http.get(
      `${BASE_URL}/api/v1/patients/${scenario.id}/outcome-measures/trending?measureType=${measureType}`,
      params
    );

    check(trendRes, {
      'trending status ok': (r) => r.status === 200 || r.status === 404,
      'has data points': (r) => {
        if (r.status === 404) return true;
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.dataPoints);
        } catch {
          return false;
        }
      },
    });
  }

  // Test 3: Get all patient measures (heavy query)
  if (Math.random() < 0.2) { // 20% of requests fetch all measures
    const allRes = http.get(
      `${BASE_URL}/api/v1/patients/${scenario.id}/outcome-measures`,
      params
    );

    check(allRes, {
      'all measures status ok': (r) => r.status === 200,
      'returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    });
  }

  // Simulate realistic user behavior (2-4 second think time)
  sleep(Math.random() * 2 + 2);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const errorRate = data.metrics.http_req_failed.values.rate;

  return {
    'stdout': textSummary(data),
    'outcome-measures-results.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];

  return `
Outcome Measures Progress Calculation Load Test Results
=========================================================

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

Data Points Processed: ${data.metrics.data_points_processed.values.count}

Thresholds:
  p95 < 500ms: ${p95 < 500 ? 'PASS ✓' : 'FAIL ✗'}
  Error rate < 1%: ${data.metrics.http_req_failed.values.rate < 0.01 ? 'PASS ✓' : 'FAIL ✗'}
`;
}
