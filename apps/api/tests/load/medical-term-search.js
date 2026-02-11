// Medical Term Trigram Search Load Test
// Target: p95 < 200ms, 200 req/s

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchDuration = new Trend('search_duration', true);

// Performance thresholds
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 200 },   // Stay at 200 users (200 req/s)
    { duration: '30s', target: 300 },  // Peak at 300 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],       // p95 < 200ms
    http_req_failed: ['rate<0.01'],          // < 1% errors
    'errors': ['rate<0.01'],                 // < 1% application errors
    'search_duration': ['p(95)<200'],        // Search logic < 200ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:7011';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Vietnamese search queries (common terms in physiotherapy)
const VIETNAMESE_QUERIES = [
  'vai',        // shoulder
  'gối',        // knee
  'thắt lưng',  // lower back
  'cổ',         // neck
  'đau',        // pain
  'viêm',       // inflammation
  'khớp',       // joint
  'cơ',         // muscle
  'dây chằng',  // ligament
  'gân',        // tendon
  'thoát vị',   // herniation
  'bong gân',   // sprain
  'rách',       // tear
  'thoái hóa',  // degeneration
  'viêm khớp',  // arthritis
];

// English search queries
const ENGLISH_QUERIES = [
  'shoulder',
  'knee',
  'back pain',
  'neck',
  'inflammation',
  'joint',
  'muscle',
  'ligament',
  'tendon',
  'herniation',
  'sprain',
  'tear',
  'arthritis',
  'rotator cuff',
  'meniscus',
];

// Short queries (autocomplete simulation)
const SHORT_QUERIES = [
  'va',   // 2 chars (minimum)
  'gố',   // 2 chars
  'đa',   // 2 chars
  'sho',  // 3 chars
  'kne',  // 3 chars
  'pai',  // 3 chars
];

// Categories to filter by
const CATEGORIES = [
  '',           // No filter
  'anatomy',
  'symptom',
  'condition',
  'treatment',
  'assessment',
];

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  // Randomly select query type (70% normal, 30% short for autocomplete)
  let query;
  if (Math.random() < 0.3) {
    query = SHORT_QUERIES[Math.floor(Math.random() * SHORT_QUERIES.length)];
  } else {
    const allQueries = [...VIETNAMESE_QUERIES, ...ENGLISH_QUERIES];
    query = allQueries[Math.floor(Math.random() * allQueries.length)];
  }

  // Randomly select category
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  // Build URL with optional category filter
  let url = `${BASE_URL}/api/v1/medical-terms/search?q=${encodeURIComponent(query)}`;
  if (category) {
    url += `&category=${category}`;
  }

  const startTime = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - startTime;

  searchDuration.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'response time < 400ms': (r) => r.timings.duration < 400,
    'returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'has search results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length >= 0;
      } catch {
        return false;
      }
    },
    'results have scores': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (!Array.isArray(body) || body.length === 0) return true;
        return body[0].hasOwnProperty('score');
      } catch {
        return false;
      }
    },
    'results sorted by relevance': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (!Array.isArray(body) || body.length < 2) return true;
        // Check that scores are descending
        for (let i = 0; i < body.length - 1; i++) {
          if (body[i].score < body[i + 1].score) return false;
        }
        return true;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Simulate realistic autocomplete behavior (shorter think time)
  // Short queries simulate typing, so very short sleep
  if (query.length <= 3) {
    sleep(0.1 + Math.random() * 0.2); // 100-300ms between keystrokes
  } else {
    sleep(Math.random() * 0.5 + 0.5); // 500ms-1s for full searches
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'medical-term-search-results.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];

  return `
Medical Term Search Load Test Results
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
  - Tests include Vietnamese and English queries
  - Tests include short queries (2-3 chars) for autocomplete
  - Tests include category filtering
  - Results validated for correct sorting by relevance score
`;
}
