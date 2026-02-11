# Outcome Measures System

## Overview

The Outcome Measures system provides standardized assessment tools for tracking patient progress through validated clinical measurement instruments. It includes 8 standardized measures commonly used in Vietnamese physical therapy practice, automatic progress calculation with MCID (Minimal Clinically Important Difference) tracking, and trending visualization for clinical decision-making.

## Key Concepts

### Outcome Measure Types

PhysioFlow supports 8 standardized outcome measures:

| Code | Measure | Vietnamese Name | Min | Max | Higher is Better | MCID |
|------|---------|-----------------|-----|-----|------------------|------|
| **VAS** | Visual Analog Scale | Thang đo đau VAS | 0 | 10 | No | 2.0 |
| **NDI** | Neck Disability Index | Chỉ số khuyết tật cổ | 0 | 50 | No | 7.5 |
| **ODI** | Oswestry Disability Index | Chỉ số khuyết tật Oswestry | 0 | 100 | No | 10.0 |
| **LEFS** | Lower Extremity Functional Scale | Thang chức năng chi dưới | 0 | 80 | Yes | 9.0 |
| **DASH** | Disabilities of Arm, Shoulder, Hand | Chỉ số khuyết tật tay-vai-cẳng tay | 0 | 100 | No | 10.0 |
| **QuickDASH** | Quick DASH (shortened) | DASH rút gọn | 0 | 100 | No | 8.0 |
| **PSFS** | Patient-Specific Functional Scale | Thang chức năng đặc hiệu | 0 | 10 | Yes | 2.0 |
| **FIM** | Functional Independence Measure | Thang độc lập chức năng | 18 | 126 | Yes | 22.0 |

### MCID (Minimal Clinically Important Difference)

MCID represents the smallest change in a measure that patients perceive as beneficial. It's used to determine if progress is clinically meaningful, not just statistically significant.

**Formula**:
```
Change = Current Score - Baseline Score

MCID Met = |Change| >= MCID Threshold

Clinical Significance:
  If MCID Met AND Change is in beneficial direction:
    → Clinically significant improvement
  Else:
    → Change may not be meaningful to patient
```

**Example**:
```
Measure: NDI (Neck Disability Index)
Baseline: 30 (severe disability)
Current: 20 (moderate disability)
MCID: 7.5

Change = 30 - 20 = 10 points
MCID Met? |10| >= 7.5 → Yes ✓
Direction? 30 → 20 (lower is better) → Improvement ✓

Result: Clinically significant improvement
```

### Progress Calculation

Progress is calculated comparing current score to baseline (first recorded measurement).

```
Baseline Score: First measurement recorded
Current Score: Most recent measurement
Previous Score: Second-to-last measurement

Absolute Change = Current - Baseline
Percent Change = (Absolute Change / Baseline) × 100%

Trend Analysis:
  - Improving: Moving toward better outcome
  - Stable: No significant change (< MCID)
  - Declining: Moving away from better outcome
```

### Phase Tracking

Measurements can be tracked across treatment phases:

1. **Initial**: First 2-4 weeks (baseline establishment)
2. **Intermediate**: Weeks 4-8 (active progress)
3. **Advanced**: Weeks 8-12 (maintenance/discharge preparation)
4. **Discharge**: Final assessment before discharge

## Architecture

### Database Schema

```sql
-- Outcome measures library (reference data)
CREATE TABLE outcome_measures_library (
    id UUID PRIMARY KEY,

    -- Measure identification
    measure_type VARCHAR(100) NOT NULL UNIQUE,  -- 'vas', 'ndi', 'odi', etc.
    measure_type_vi VARCHAR(100),

    -- Bilingual descriptions
    description TEXT,
    description_vi TEXT,

    -- Scoring parameters
    scale_min DECIMAL(10,2),
    scale_max DECIMAL(10,2),
    higher_is_better BOOLEAN NOT NULL DEFAULT TRUE,
    mcid_threshold DECIMAL(10,2),

    -- Categorization
    category VARCHAR(100),  -- pain, disability, function, etc.
    applicable_body_regions TEXT[],

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patient outcome measurements (partitioned by year)
CREATE TABLE outcome_measures (
    id UUID NOT NULL,
    patient_id UUID NOT NULL,
    library_id UUID REFERENCES outcome_measures_library(id),

    -- Measure details
    measure_type VARCHAR(100) NOT NULL,
    measure_type_vi VARCHAR(100),

    -- Scores
    baseline_score DECIMAL(10,2),
    current_score DECIMAL(10,2),
    target_score DECIMAL(10,2),

    -- Measurement context
    measurement_date DATE NOT NULL,
    assessed_by UUID,
    treatment_session_id UUID,

    -- MCID tracking (computed column)
    mcid_threshold DECIMAL(10,2),
    mcid_met BOOLEAN GENERATED ALWAYS AS (
        CASE
            WHEN baseline_score IS NOT NULL
             AND current_score IS NOT NULL
             AND mcid_threshold IS NOT NULL
            THEN ABS(current_score - baseline_score) >= mcid_threshold
            ELSE NULL
        END
    ) STORED,

    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (id, measurement_date)
) PARTITION BY RANGE (measurement_date);

-- Year partitions (2024-2030)
CREATE TABLE outcome_measures_2026 PARTITION OF outcome_measures
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### Indexes

```sql
-- Fast patient queries
CREATE INDEX idx_outcome_measures_patient_id
ON outcome_measures (patient_id);

-- Measure type filtering
CREATE INDEX idx_outcome_measures_measure_type
ON outcome_measures (measure_type);

-- Date range queries
CREATE INDEX idx_outcome_measures_measurement_date
ON outcome_measures (measurement_date);

-- Composite index for trending
CREATE INDEX idx_outcome_measures_patient_type_date
ON outcome_measures (patient_id, measure_type, measurement_date);
```

## API Reference

Base URL: `/api/v1/patients/{patientId}/outcome-measures`

### Record Measure

Records a new outcome measure score for a patient.

**Endpoint**: `POST /api/v1/patients/{patientId}/outcome-measures`

**Request Body**:
```json
{
  "library_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "measure_type": "ndi",
  "score": 20.0,
  "max_possible": 50.0,
  "responses": [
    {"question_id": 1, "answer": 2},
    {"question_id": 2, "answer": 1}
  ],
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "notes": "Patient reports significant improvement in neck pain",
  "measured_at": "2026-02-11T10:00:00Z"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "library_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "measure_type": "ndi",
  "score": 20.0,
  "max_possible": 50.0,
  "percentage": 40.0,
  "interpretation": {
    "severity": "moderate",
    "severity_vi": "Trung bình",
    "description": "Moderate disability",
    "description_vi": "Khuyết tật trung bình"
  },
  "measured_at": "2026-02-11T10:00:00Z",
  "created_at": "2026-02-11T10:05:00Z",
  "library": {
    "code": "NDI",
    "name": "Neck Disability Index",
    "name_vi": "Chỉ số khuyết tật cổ",
    "mcid": 7.5
  }
}
```

### Get Patient Measures

Retrieves all outcome measurements for a patient.

**Endpoint**: `GET /api/v1/patients/{patientId}/outcome-measures`

**Query Parameters**:
- `measure_type` (optional): Filter by measure type (e.g., `ndi`, `vas`)
- `from_date` (optional): Start date (ISO 8601)
- `to_date` (optional): End date (ISO 8601)

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "measure_type": "ndi",
    "score": 20.0,
    "percentage": 40.0,
    "measured_at": "2026-02-11T10:00:00Z"
  },
  {
    "id": "660f9511-f3ac-52e5-b827-557766551111",
    "measure_type": "ndi",
    "score": 30.0,
    "percentage": 60.0,
    "measured_at": "2026-01-15T14:00:00Z"
  }
]
```

### Calculate Progress

Calculates progress comparing baseline to current score for a measure type.

**Endpoint**: `GET /api/v1/patients/{patientId}/outcome-measures/progress`

**Query Parameters**:
- `measureType` (required): Measure type (e.g., `ndi`, `odi`, `vas`)

**Response** (200 OK):
```json
{
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "measure_type": "ndi",
  "library_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "baseline_score": 30.0,
  "current_score": 20.0,
  "previous_score": 25.0,
  "change": -10.0,
  "change_percent": -33.33,
  "meets_mcid": true,
  "trend": "improving",
  "total_measurements": 5,
  "calculated_at": "2026-02-11T15:00:00Z"
}
```

**Trend Values**:
- `improving`: Change is in beneficial direction and meets MCID
- `stable`: Change is below MCID threshold
- `declining`: Change is in unfavorable direction

### Get Trending Data

Retrieves time-series data for charting outcome trends.

**Endpoint**: `GET /api/v1/patients/{patientId}/outcome-measures/trending`

**Query Parameters**:
- `measureType` (required): Measure type

**Response** (200 OK):
```json
{
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "measure_type": "ndi",
  "measure_name": "Neck Disability Index",
  "measure_name_vi": "Chỉ số khuyết tật cổ",
  "baseline": 30.0,
  "goal": 15.0,
  "mcid": 7.5,
  "trend": "improving",
  "data_points": [
    {
      "score": 30.0,
      "percentage": 60.0,
      "measured_at": "2026-01-15T14:00:00Z",
      "session_id": "123e4567-e89b-12d3-a456-426614174000",
      "notes": "Initial assessment"
    },
    {
      "score": 25.0,
      "percentage": 50.0,
      "measured_at": "2026-01-29T10:00:00Z",
      "notes": "Week 2 follow-up"
    },
    {
      "score": 20.0,
      "percentage": 40.0,
      "measured_at": "2026-02-11T10:00:00Z",
      "notes": "Significant improvement noted"
    }
  ]
}
```

### Get Measure Library

Retrieves all available outcome measure definitions.

**Endpoint**: `GET /api/v1/outcome-measures/library`

**Response** (200 OK):
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "code": "NDI",
    "measure_type": "ndi",
    "category": "disability",
    "name": "Neck Disability Index",
    "name_vi": "Chỉ số khuyết tật cổ",
    "description": "Assesses how neck pain affects daily activities",
    "description_vi": "Đánh giá ảnh hưởng của đau cổ đến hoạt động hàng ngày",
    "min_score": 0.0,
    "max_score": 50.0,
    "higher_is_better": false,
    "mcid": 7.5,
    "body_region": "cervical_spine",
    "is_global": true,
    "is_active": true
  }
]
```

## Frontend Usage

### React Component Example

```typescript
import { useOutcomeMeasures } from '@/hooks/use-outcome-measures';
import { ProgressChart } from '@/components/outcome-measures/ProgressChart';
import { TrendingView } from '@/components/outcome-measures/TrendingView';

function PatientOutcomesPage({ patientId }: { patientId: string }) {
  const {
    measures,
    progress,
    trending,
    loading,
    recordMeasure,
    calculateProgress,
    getTrending
  } = useOutcomeMeasures(patientId);

  // Record new measurement
  const handleRecordMeasure = async (data: MeasureFormData) => {
    try {
      await recordMeasure({
        library_id: data.library_id,
        measure_type: data.measure_type,
        score: data.score,
        max_possible: data.max_possible,
        measured_at: new Date().toISOString(),
      });
      toast.success('Đã ghi nhận kết quả đánh giá');
    } catch (error) {
      toast.error('Không thể ghi nhận đánh giá');
    }
  };

  // Load progress for specific measure
  const loadProgress = async (measureType: string) => {
    const progressData = await calculateProgress(measureType);
    setSelectedProgress(progressData);
  };

  return (
    <div>
      <h1>Outcome Measures</h1>

      {/* Progress Summary */}
      <div className="progress-cards">
        {['ndi', 'odi', 'vas'].map((type) => (
          <ProgressCard
            key={type}
            measureType={type}
            onClick={() => loadProgress(type)}
          />
        ))}
      </div>

      {/* Trending Chart */}
      {selectedProgress && (
        <TrendingView
          patientId={patientId}
          measureType={selectedProgress.measure_type}
          showMCID={true}
          showBaseline={true}
          showGoal={true}
        />
      )}

      {/* Record New Measure */}
      <MeasureForm onSubmit={handleRecordMeasure} />
    </div>
  );
}
```

### Progress Chart Component

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

interface TrendingViewProps {
  patientId: string;
  measureType: string;
  showMCID?: boolean;
  showBaseline?: boolean;
  showGoal?: boolean;
}

export function TrendingView({
  patientId,
  measureType,
  showMCID = true,
  showBaseline = true,
  showGoal = true
}: TrendingViewProps) {
  const { data: trending } = useQuery(['trending', patientId, measureType], () =>
    api.getOutcomeTrending(patientId, measureType)
  );

  if (!trending) return <Spinner />;

  const chartData = trending.data_points.map(point => ({
    date: new Date(point.measured_at).toLocaleDateString('vi-VN'),
    score: point.score,
    percentage: point.percentage,
  }));

  return (
    <div className="trending-chart">
      <h3>
        {trending.measure_name_vi} Trend
        <span className={`trend-badge trend-${trending.trend}`}>
          {trending.trend === 'improving' ? '↗ Cải thiện' :
           trending.trend === 'stable' ? '→ Ổn định' :
           '↘ Giảm'}
        </span>
      </h3>

      <LineChart width={800} height={400} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />

        <Line
          type="monotone"
          dataKey="score"
          stroke="#8884d8"
          strokeWidth={2}
          name="Score"
        />

        {showBaseline && trending.baseline && (
          <ReferenceLine
            y={trending.baseline}
            stroke="#ff7300"
            strokeDasharray="5 5"
            label="Baseline"
          />
        )}

        {showGoal && trending.goal && (
          <ReferenceLine
            y={trending.goal}
            stroke="#82ca9d"
            strokeDasharray="5 5"
            label="Goal"
          />
        )}

        {showMCID && trending.mcid && (
          <ReferenceLine
            y={trending.baseline - trending.mcid}
            stroke="#ff0000"
            strokeDasharray="3 3"
            label="MCID Threshold"
          />
        )}
      </LineChart>

      {trending.meets_mcid && (
        <div className="mcid-indicator">
          ✓ Patient has achieved clinically significant change (MCID met)
        </div>
      )}
    </div>
  );
}
```

## Mobile Offline Support

### WatermelonDB Model

```typescript
// models/OutcomeMeasure.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class OutcomeMeasure extends Model {
  static table = 'outcome_measures';

  @field('patient_id') patientId!: string;
  @field('library_id') libraryId!: string;
  @field('measure_type') measureType!: string;
  @field('score') score!: number;
  @field('max_possible') maxPossible!: number;
  @field('percentage') percentage!: number | null;
  @field('session_id') sessionId!: string | null;
  @field('notes') notes!: string;
  @date('measured_at') measuredAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @field('_synced') _synced!: boolean;
}
```

### Offline Recording

```typescript
// Record measure offline
async function recordMeasureOffline(data: CreateMeasureRequest) {
  const database = getDatabase();
  const measuresCollection = database.collections.get<OutcomeMeasure>('outcome_measures');

  await database.write(async () => {
    const measure = await measuresCollection.create(measure => {
      measure.patientId = data.patient_id;
      measure.libraryId = data.library_id;
      measure.measureType = data.measure_type;
      measure.score = data.score;
      measure.maxPossible = data.max_possible;
      measure.measuredAt = new Date(data.measured_at);
      measure._synced = false; // Mark for sync
    });

    // Add to sync queue
    await syncQueue.push({
      type: 'outcome_measure',
      action: 'create',
      data: measure._raw,
      priority: 'medium',
    });
  });
}
```

## Configuration

### Environment Variables

```bash
# Outcome measures settings
OUTCOME_MEASURES_ENABLED=true
AUTO_CALCULATE_PROGRESS=true
ENABLE_MCID_TRACKING=true
DEFAULT_MCID_THRESHOLD=2.0  # Fallback if not in library
```

### Admin Settings

```typescript
interface OutcomeMeasuresSettings {
  // Measurement
  require_measure_type: boolean;
  auto_calculate_percentage: boolean;
  validate_score_ranges: boolean;

  // Progress tracking
  auto_calculate_progress: boolean;
  baseline_window_days: number;  // Days to consider as baseline
  progress_frequency_days: number;  // How often to calculate

  // MCID
  enable_mcid_tracking: boolean;
  show_mcid_alerts: boolean;
  mcid_alert_threshold_days: number;  // Alert if no progress after N days

  // Trending
  trending_min_data_points: number;  // Minimum points for trend line
  trending_lookback_days: number;  // How far back to fetch data
}
```

## Troubleshooting

### No Baseline Score

**Symptom**: Progress calculation returns "No baseline found".

**Cause**: Patient has only one measurement recorded.

**Solution**: Ensure at least 2 measurements exist. The first measurement is considered baseline.

```typescript
// Check measurement count
const measures = await getMeasures(patientId, measureType);
if (measures.length < 2) {
  return {
    error: 'Need at least 2 measurements to calculate progress',
    error_vi: 'Cần ít nhất 2 lần đánh giá để tính tiến triển'
  };
}
```

### MCID Not Calculating

**Symptom**: `mcid_met` field is always `null`.

**Cause**: Missing `mcid_threshold` in outcome_measures_library.

**Solution**:
```sql
-- Update library entry with MCID
UPDATE outcome_measures_library
SET mcid_threshold = 7.5
WHERE measure_type = 'ndi';

-- Recalculate MCID for existing measurements
-- (mcid_met is a computed column, will auto-update on next query)
```

### Trending Chart Empty

**Symptom**: Chart shows no data points.

**Cause**: Query filters are too restrictive or no measurements exist.

**Solution**:
```typescript
// Check if measurements exist
const measures = await api.getPatientMeasures(patientId, { measure_type: 'ndi' });
console.log(`Found ${measures.length} measurements`);

// Expand date range
const trending = await api.getTrending(patientId, 'ndi', {
  from_date: subMonths(new Date(), 6).toISOString(),  // 6 months back
  to_date: new Date().toISOString()
});
```

## References

### Outcome Measure Resources

- **NDI**: [Neck Disability Index](https://www.spine-health.com/treatment/pain-management/neck-pain-assessment-tools)
- **ODI**: [Oswestry Disability Index](https://www.physio-pedia.com/Oswestry_Disability_Index)
- **DASH**: [Disabilities of Arm, Shoulder and Hand](https://dash.iwh.on.ca/)
- **LEFS**: [Lower Extremity Functional Scale](https://www.physio-pedia.com/Lower_Extremity_Functional_Scale)
- **FIM**: [Functional Independence Measure](https://www.sralab.org/rehabilitation-measures/functional-independence-measure)

### MCID Literature

- Wright, A., et al. (2012). "Clinimetrics Corner: A Closer Look at the Minimal Clinically Important Difference (MCID)". *Journal of Manual & Manipulative Therapy*, 20(3), 160-166.
- Young, I. A., et al. (2009). "Reliability, construct validity, and responsiveness of the neck disability index, patient-specific functional scale, and numeric pain rating scale in patients with cervical radiculopathy". *American Journal of Physical Medicine & Rehabilitation*, 88(10), 831-839.

### Internal Documentation

- [Discharge Planning](./DISCHARGE_PLANNING.md) - Using outcomes at discharge
- [Clinical Protocols](./CLINICAL_PROTOCOLS.md) - Protocol-based outcome tracking
- [API Reference](../api/VIETNAMESE_PT_ENDPOINTS.md) - Complete endpoint documentation
