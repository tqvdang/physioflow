# BHYT Insurance System

## Overview

The BHYT (Bảo hiểm Y tế - Vietnamese Health Insurance) system provides comprehensive insurance card validation, coverage calculation, and claims management for physical therapy services in Vietnam. It supports all 18 official BHYT prefix codes across 8 beneficiary categories as defined by Vietnamese Social Health Insurance (VSSID).

## Key Concepts

### BHYT Card Structure

Vietnamese BHYT cards follow a standardized 15-character format:

```
Format: [PREFIX][12 DIGITS]
Example: DN1234567890123

Components:
- Prefix (3 chars): 2 uppercase letters + 1 digit (e.g., DN1, HC2, TE1)
- Identifier (12 digits): Unique card number
```

### Beneficiary Categories (8 Categories, 18 Prefixes)

| Category | Prefix Codes | Coverage | Copay | Description |
|----------|--------------|----------|-------|-------------|
| **Healthcare Workers** | HC1, HC2, HC3, HC4 | 80-100% | 0-20% | Civil servants, healthcare workers, dependents |
| **Enterprise Workers** | DN1, DN2, DN3 | 80% | 20% | Full-time, part-time, dependents |
| **Children** | TE1, TE2, TE3 | 80-100% | 0-20% | Under 6, poor households, students |
| **War Veterans** | CB1, CB2 | 95-100% | 0-5% | Veterans, contributors, dependents |
| **Poor Households** | XK1, XK2 | 95-100% | 0-5% | Poor and near-poor households |
| **Farmers/Self-Employed** | NN1, NN2, NN3 | 80% | 20% | Agriculture, self-employed, household business |
| **Voluntary** | TN1, TN2 | 80% | 20% | New and continuous voluntary participants |
| **Social Insurance** | TX1, TX2 | 95% | 5% | Pension and allowance recipients |

### Coverage Calculation Formula

```
Total Bill = Service Cost × Quantity

Insurance Covers:
  If service is BHYT-covered:
    Insurance Amount = Total Bill × Coverage Percent
    Patient Copay = Total Bill × Copay Rate
  Else:
    Insurance Amount = 0
    Patient Copay = Total Bill (100%)

Final Amounts:
  Insurance Pays = Sum(Insurance Amount for all covered services)
  Patient Pays = Sum(Patient Copay for all services)
```

Example calculation:
```
Service: Therapeutic Exercise (PT001)
- Unit Price: 250,000 VND
- BHYT Covered: Yes
- Card: DN1 (Enterprise Worker)
- Coverage: 80%, Copay: 20%

Calculation:
  Insurance Amount = 250,000 × 0.80 = 200,000 VND
  Patient Copay = 250,000 × 0.20 = 50,000 VND
```

## Architecture

### Database Schema

```sql
-- Insurance info table (extends patients table)
CREATE TABLE insurance_info (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),

    -- Card details
    bhyt_card_number VARCHAR(15) UNIQUE,
    bhyt_prefix_code VARCHAR(5),

    -- Coverage rates
    bhyt_coverage_percent DECIMAL(5,2),  -- 80.00, 95.00, 100.00
    bhyt_copay_rate DECIMAL(5,2),         -- 20.00, 5.00, 0.00

    -- Validity
    effective_date DATE NOT NULL,
    expiry_date DATE NOT NULL,

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation rules table (18 prefix codes)
CREATE TABLE bhyt_validation_rules (
    id UUID PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_name_vi VARCHAR(255),

    -- Prefix codes (JSONB array)
    prefix_codes JSONB NOT NULL,  -- ["HC1"], ["DN1"], etc.
    regex_pattern VARCHAR(255),    -- ^HC1[0-9]{12}$

    -- Coverage details
    coverage_percent DECIMAL(5,2),
    copay_rate DECIMAL(5,2),

    -- Beneficiary category
    beneficiary_category VARCHAR(100),
    beneficiary_category_vi VARCHAR(100),

    -- Validity period
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Indexes

```sql
-- Fast card number lookups
CREATE INDEX idx_insurance_bhyt_card_number
ON insurance_info (bhyt_card_number)
WHERE bhyt_card_number IS NOT NULL;

-- Prefix code searches
CREATE INDEX idx_insurance_bhyt_prefix
ON insurance_info (bhyt_prefix_code)
WHERE bhyt_prefix_code IS NOT NULL;

-- Validation rules prefix search (GIN for JSONB)
CREATE INDEX idx_bhyt_rules_prefix_codes
ON bhyt_validation_rules USING GIN (prefix_codes);
```

## API Reference

Base URL: `/api/v1/patients/{patientId}/insurance`

### Create Insurance Card

Registers a new BHYT card for a patient with automatic validation.

**Endpoint**: `POST /api/v1/patients/{patientId}/insurance`

**Request Body**:
```json
{
  "card_number": "DN1234567890123",
  "effective_date": "2026-01-01",
  "expiry_date": "2026-12-31",
  "facility_code": "79024",
  "facility_name": "BV Đa Khoa Quận Thủ Đức",
  "facility_name_vi": "Bệnh viện Đa khoa Quận Thủ Đức"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "card_number": "DN1234567890123",
  "prefix_code": "DN1",
  "coverage_percent": 80.00,
  "copay_rate": 20.00,
  "beneficiary_category": "enterprise_worker",
  "beneficiary_category_vi": "Lao động doanh nghiệp",
  "effective_date": "2026-01-01",
  "expiry_date": "2026-12-31",
  "is_valid": true,
  "created_at": "2026-02-11T10:30:00Z",
  "updated_at": "2026-02-11T10:30:00Z"
}
```

**Error Codes**:
- `400` - Invalid card number format
- `401` - Unauthorized
- `422` - Validation failed (invalid prefix, expired date)

### Get Patient Insurance

Retrieves the active BHYT card for a patient.

**Endpoint**: `GET /api/v1/patients/{patientId}/insurance`

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "card_number": "DN1234567890123",
  "prefix_code": "DN1",
  "coverage_percent": 80.00,
  "copay_rate": 20.00,
  "beneficiary_category": "enterprise_worker",
  "beneficiary_category_vi": "Lao động doanh nghiệp",
  "effective_date": "2026-01-01",
  "expiry_date": "2026-12-31",
  "is_valid": true,
  "days_until_expiry": 324
}
```

**Error Codes**:
- `404` - No active insurance card found
- `401` - Unauthorized

### Update Insurance Card

Updates an existing BHYT card with optimistic locking to prevent concurrent modifications.

**Endpoint**: `PUT /api/v1/patients/{patientId}/insurance/{id}`

**Request Body**:
```json
{
  "card_number": "DN1234567890123",
  "effective_date": "2026-01-01",
  "expiry_date": "2027-12-31",
  "version": 1
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "version": 2,
  "updated_at": "2026-02-11T14:20:00Z"
}
```

**Error Codes**:
- `404` - Insurance card not found
- `409` - Version conflict (card modified by another request)
- `422` - Validation failed

### Validate BHYT Card

Validates a BHYT card number format, prefix code, and checks expiration.

**Endpoint**: `POST /api/v1/patients/{patientId}/insurance/validate`

**Request Body**:
```json
{
  "card_number": "HC1234567890123"
}
```

**Response** (200 OK):
```json
{
  "is_valid": true,
  "prefix_code": "HC1",
  "coverage_percent": 80.00,
  "copay_rate": 20.00,
  "beneficiary_category": "civil_servant",
  "beneficiary_category_vi": "Công chức",
  "rule_name": "Healthcare Workers - Category 1",
  "rule_name_vi": "Cán bộ y tế - Loại 1",
  "validation_errors": []
}
```

**Invalid Card Response**:
```json
{
  "is_valid": false,
  "validation_errors": [
    {
      "field": "card_number",
      "message": "Invalid prefix code",
      "message_vi": "Mã đầu thẻ không hợp lệ"
    }
  ]
}
```

### Calculate Coverage

Calculates BHYT coverage and copay amounts for service codes.

**Endpoint**: `POST /api/v1/patients/{patientId}/insurance/calculate-coverage`

**Request Body**:
```json
{
  "service_codes": ["PT001", "PT002", "PT003"],
  "quantities": [1, 1, 1]
}
```

**Response** (200 OK):
```json
{
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "card_number": "DN1234567890123",
  "coverage_percent": 80.00,
  "copay_rate": 20.00,
  "subtotal": 750000.00,
  "insurance_amount": 600000.00,
  "copay_amount": 150000.00,
  "currency": "VND",
  "line_items": [
    {
      "code": "PT001",
      "name": "Therapeutic Exercise",
      "name_vi": "Tập luyện trị liệu",
      "unit_price": 250000.00,
      "quantity": 1,
      "bhyt_covered": true,
      "insurance_amount": 200000.00,
      "patient_amount": 50000.00
    },
    {
      "code": "PT002",
      "name": "Manual Therapy",
      "name_vi": "Liệu pháp thủ công",
      "unit_price": 300000.00,
      "quantity": 1,
      "bhyt_covered": true,
      "insurance_amount": 240000.00,
      "patient_amount": 60000.00
    },
    {
      "code": "PT003",
      "name": "Modalities",
      "name_vi": "Vật lý trị liệu",
      "unit_price": 200000.00,
      "quantity": 1,
      "bhyt_covered": true,
      "insurance_amount": 160000.00,
      "patient_amount": 40000.00
    }
  ],
  "calculated_at": "2026-02-11T15:00:00Z"
}
```

**Error Codes**:
- `404` - No active insurance card or service code not found
- `400` - Invalid request (mismatched array lengths)

## Frontend Usage

### React Hook Example

```typescript
import { useInsurance } from '@/hooks/use-insurance';

function InsuranceCardForm({ patientId }: { patientId: string }) {
  const {
    card,
    loading,
    createCard,
    updateCard,
    validateCard,
    calculateCoverage
  } = useInsurance(patientId);

  // Validate card on input
  const handleCardInput = async (cardNumber: string) => {
    const result = await validateCard(cardNumber);
    if (result.is_valid) {
      setCoverage(result.coverage_percent);
      setCopay(result.copay_rate);
    }
  };

  // Create new card
  const handleSubmit = async (data: CardFormData) => {
    try {
      await createCard(data);
      toast.success('Thẻ BHYT đã được thêm');
    } catch (error) {
      toast.error('Không thể tạo thẻ BHYT');
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        name="card_number"
        onChange={(e) => handleCardInput(e.target.value)}
        pattern="^[A-Z]{2}[0-9]{13}$"
        placeholder="DN1234567890123"
      />
      {card && (
        <CoverageDisplay
          coverage={card.coverage_percent}
          copay={card.copay_rate}
          category={card.beneficiary_category_vi}
        />
      )}
    </Form>
  );
}
```

### Vue Component Example

```vue
<template>
  <div class="insurance-form">
    <input
      v-model="cardNumber"
      @input="validateCardNumber"
      :class="{ 'is-invalid': !validationResult?.is_valid }"
      placeholder="Nhập số thẻ BHYT"
    />

    <div v-if="validationResult?.is_valid" class="coverage-info">
      <p>Bảo hiểm chi trả: {{ validationResult.coverage_percent }}%</p>
      <p>Bệnh nhân chi trả: {{ validationResult.copay_rate }}%</p>
      <p>Loại thẻ: {{ validationResult.beneficiary_category_vi }}</p>
    </div>

    <div v-else-if="validationResult?.validation_errors.length">
      <ul class="error-list">
        <li v-for="error in validationResult.validation_errors" :key="error.field">
          {{ error.message_vi }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useInsuranceApi } from '@/composables/useInsuranceApi';

const { validateCard } = useInsuranceApi();
const cardNumber = ref('');
const validationResult = ref(null);

const validateCardNumber = async () => {
  if (cardNumber.value.length === 15) {
    validationResult.value = await validateCard(cardNumber.value);
  }
};
</script>
```

## Mobile Offline Sync

The mobile app caches insurance data for offline use and syncs changes when online.

### WatermelonDB Model

```typescript
// models/InsuranceCard.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class InsuranceCard extends Model {
  static table = 'insurance_cards';

  @field('patient_id') patientId!: string;
  @field('card_number') cardNumber!: string;
  @field('prefix_code') prefixCode!: string;
  @field('coverage_percent') coveragePercent!: number;
  @field('copay_rate') copayRate!: number;
  @field('beneficiary_category') beneficiaryCategory!: string;
  @date('effective_date') effectiveDate!: Date;
  @date('expiry_date') expiryDate!: Date;
  @field('is_valid') isValid!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('_synced') _synced!: boolean;
}
```

### Sync Queue Behavior

```typescript
// lib/services/sync/insuranceSync.ts
export async function syncInsuranceCard(card: InsuranceCard) {
  // Add to sync queue
  await syncQueue.push({
    type: 'insurance_card',
    action: card._status === 'created' ? 'create' : 'update',
    data: {
      id: card.id,
      patient_id: card.patientId,
      card_number: card.cardNumber,
      effective_date: card.effectiveDate.toISOString(),
      expiry_date: card.expiryDate.toISOString(),
    },
    priority: 'high', // Insurance data is high priority
    retry_count: 0,
    max_retries: 3,
  });

  // When online, sync worker processes queue
  if (isOnline()) {
    await processSyncQueue();
  }
}
```

### Conflict Resolution

```typescript
// Handle server conflict (409)
if (error.status === 409) {
  // Server has newer version, prompt user
  const userChoice = await showConflictDialog({
    local: localCard,
    server: error.data.current_version,
  });

  if (userChoice === 'use_server') {
    await updateLocalFromServer(error.data.current_version);
  } else if (userChoice === 'use_local') {
    await forceSyncToServer(localCard);
  }
}
```

## Configuration

### Environment Variables

```bash
# API configuration
BHYT_VALIDATION_ENABLED=true
BHYT_AUTO_CALCULATE_COVERAGE=true
BHYT_STRICT_PREFIX_VALIDATION=true

# Feature flags
ENABLE_BHYT_CLAIMS_EXPORT=true
ENABLE_BHYT_ONLINE_VERIFICATION=false  # Future: Online VSSID API
```

### Application Settings (Admin Panel)

```typescript
// Admin settings for BHYT
interface BHYTSettings {
  // Validation
  require_valid_card: boolean;
  allow_expired_cards: boolean;
  strict_format_validation: boolean;

  // Coverage
  default_coverage_percent: number;  // Fallback if prefix not found
  default_copay_rate: number;

  // Claims
  auto_submit_claims: boolean;
  claims_batch_size: number;
  claims_export_format: 'xml' | 'csv' | 'json';
}
```

## Troubleshooting

### Common Issues

#### Invalid Card Number Format

**Symptom**: Validation returns `is_valid: false` with "Invalid format" error.

**Cause**: Card number doesn't match regex pattern `^[A-Z]{2}[0-9]{13}$`.

**Solution**:
```typescript
// Validate format before API call
function validateFormat(cardNumber: string): boolean {
  const pattern = /^[A-Z]{2}[0-9]{13}$/;
  return pattern.test(cardNumber);
}

// Clean input
const cleanCardNumber = cardNumber
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .slice(0, 15);
```

#### Unknown Prefix Code

**Symptom**: Card validates but returns null coverage/copay.

**Cause**: Prefix code not in `bhyt_validation_rules` table (not one of 18 valid prefixes).

**Solution**:
```sql
-- Check if prefix exists
SELECT * FROM bhyt_validation_rules
WHERE prefix_codes @> to_jsonb('XY1');

-- Add custom prefix (admin only)
INSERT INTO bhyt_validation_rules (
  rule_name, prefix_codes, coverage_percent, copay_rate, beneficiary_category
) VALUES (
  'Custom Category', '["XY1"]', 80.00, 20.00, 'custom'
);
```

#### Coverage Calculation Mismatch

**Symptom**: Frontend shows different coverage than API response.

**Cause**: Using wrong formula or not checking `bhyt_covered` flag on service codes.

**Solution**:
```typescript
// Correct calculation
function calculateCoverage(serviceCode: ServiceCode, card: BHYTCard): Coverage {
  if (!serviceCode.bhyt_coverable) {
    return {
      insurance_amount: 0,
      patient_amount: serviceCode.unit_price,
    };
  }

  const insuranceAmount = serviceCode.unit_price * (card.coverage_percent / 100);
  const patientAmount = serviceCode.unit_price * (card.copay_rate / 100);

  return { insurance_amount: insuranceAmount, patient_amount: patientAmount };
}
```

#### Version Conflict on Update

**Symptom**: 409 error when updating card.

**Cause**: Another user/session modified the card between fetch and update (optimistic locking).

**Solution**:
```typescript
async function updateCardWithRetry(cardId: string, updates: Partial<BHYTCard>) {
  let retries = 3;
  while (retries > 0) {
    try {
      // Fetch latest version
      const latest = await getCard(cardId);

      // Update with latest version number
      return await updateCard(cardId, {
        ...updates,
        version: latest.version,
      });
    } catch (error) {
      if (error.status === 409 && retries > 1) {
        retries--;
        await sleep(1000); // Wait 1 second before retry
      } else {
        throw error;
      }
    }
  }
}
```

## References

### Vietnamese Healthcare Regulations

- **BHYT Law 2008** (Luật Bảo hiểm y tế 2008): Legal framework for Vietnamese health insurance
- **Decree 146/2018/NĐ-CP**: Implementation guidelines for BHYT coverage and rates
- **Circular 14/2019/TT-BYT**: Healthcare service pricing and insurance reimbursement
- **VSSID Documentation**: Vietnam Social Security - Insurance Department technical specs

### External Resources

- [Vietnam Social Security Portal](https://bhxh.gov.vn/)
- [BHYT Card Lookup](https://baohiemxahoi.gov.vn/tracuu)
- [Healthcare Service Catalog](https://yte.gov.vn/thong-tu-46-2018)

### Internal Documentation

- [Billing System](./BILLING.md) - Integration with invoice generation
- [Service Codes](../deployment/DATABASE_MIGRATIONS.md) - PT service code seeding
- [API Endpoints](../api/VIETNAMESE_PT_ENDPOINTS.md) - Complete API reference
