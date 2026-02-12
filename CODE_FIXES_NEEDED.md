# Code Fixes Required for Wave 5 Deployment

## Critical Issues Blocking Docker Builds

### 1. Web App: Insurance Type Missing Property

**File:** `apps/web/src/app/[locale]/patients/[id]/insurance/page.tsx`
**Line:** 137
**Error:** `Property 'prefixCode' does not exist on type 'Insurance'`

**Code:**
```typescript
const prefixInfo = insurance
  ? BHYT_PREFIX_CODES.find((p) => p.value === insurance.prefixCode)  // ← Error here
  : null;
```

**Possible Fixes:**

**Option A:** Add `prefixCode` to Insurance type
```typescript
// In packages/shared-types/src/index.ts or relevant type file
export interface Insurance {
  // ... existing fields
  prefixCode?: string;  // Add this field
}
```

**Option B:** Use correct property name
```typescript
// If the actual property is named differently, use that:
const prefixInfo = insurance
  ? BHYT_PREFIX_CODES.find((p) => p.value === insurance.bhytPrefix)  // Example
  : null;
```

**Action Required:**
1. Check the actual Insurance type definition in `packages/shared-types/`
2. Check database schema to see what field stores the BHYT prefix code
3. Either add the missing field to the type OR use the correct field name

---

### 2. API: ChecklistItem Type Mismatch

**File:** `apps/api/internal/service/assessment_template_service.go`
**Lines:** 69, 127, 131, 133, 140, 144, 147

**Errors:**
- Line 69: `cannot use template.ChecklistItems (type []model.AssessmentChecklistItem) as []model.ChecklistItem`
- Lines 127-147: `item.Required undefined`, `item.Item undefined` on type `model.ChecklistItem`

**Code Context:**
```go
// Line 69 - Type mismatch when calling validateResults
if err := validateResults(template.ChecklistItems, resultMap); err != nil {
    return nil, fmt.Errorf("validation failed: %w", err)
}

// Lines 127+ - Missing fields on ChecklistItem
for _, item := range checklistItems {
    if item.Required && !resultMap[item.ID] {  // ← item.Required undefined
        return fmt.Errorf("required item missing: %s", item.Item)  // ← item.Item undefined
    }
}
```

**Root Cause:**
- `template.ChecklistItems` is of type `[]model.AssessmentChecklistItem`
- `validateResults` expects `[]model.ChecklistItem`
- `model.ChecklistItem` is missing fields `Required` and `Item`

**Possible Fixes:**

**Option A:** Update validateResults signature
```go
// Change validateResults to accept AssessmentChecklistItem
func validateResults(checklistItems []model.AssessmentChecklistItem, resultMap map[string]bool) error {
    for _, item := range checklistItems {
        if item.Required && !resultMap[item.ID] {
            return fmt.Errorf("required item missing: %s", item.Item)
        }
    }
    return nil
}
```

**Option B:** Add fields to ChecklistItem
```go
// In apps/api/internal/model/checklist.go
type ChecklistItem struct {
    ID       string `json:"id"`
    Item     string `json:"item"`     // Add this
    Required bool   `json:"required"` // Add this
    // ... other fields
}
```

**Option C:** Convert types before calling
```go
// Convert AssessmentChecklistItem to ChecklistItem
convertedItems := make([]model.ChecklistItem, len(template.ChecklistItems))
for i, item := range template.ChecklistItems {
    convertedItems[i] = model.ChecklistItem{
        ID:       item.ID,
        Item:     item.Item,
        Required: item.Required,
        // ... map other fields
    }
}
if err := validateResults(convertedItems, resultMap); err != nil {
    return nil, fmt.Errorf("validation failed: %w", err)
}
```

**Recommended Approach:**
- Option A is cleanest - change validateResults to accept the correct type
- Check if ChecklistItem and AssessmentChecklistItem should be the same type
- If they represent different domain concepts, keep them separate but add conversion

**Action Required:**
1. Review `apps/api/internal/model/checklist.go`
2. Review `apps/api/internal/model/assessment_template.go`
3. Determine the relationship between ChecklistItem and AssessmentChecklistItem
4. Either merge the types OR update validateResults signature

---

## Investigation Files

### Web App Type Definitions
```bash
# Find Insurance type definition
grep -r "interface Insurance" packages/shared-types/
grep -r "type Insurance" apps/web/src/types/

# Find what field is actually used for BHYT prefix
grep -r "bhyt.*prefix\|prefix.*bhyt" apps/web/src/ -i
psql -d physioflow -c "\d insurances"  # Check database schema
```

### API Model Definitions
```bash
# Check ChecklistItem definition
cat apps/api/internal/model/checklist.go

# Check AssessmentChecklistItem definition
cat apps/api/internal/model/assessment_template.go

# Find all usages of these types
grep -r "ChecklistItem\|AssessmentChecklistItem" apps/api/internal/
```

---

## Testing After Fixes

### Web App
```bash
cd apps/web
pnpm build  # Should complete without type errors
```

### API
```bash
cd apps/api
go build ./cmd/api  # Should compile successfully
```

### Docker Builds
```bash
# From repository root
docker build -t test-web -f apps/web/Dockerfile .
docker build -t test-api -f apps/api/Dockerfile .
```

---

## Priority

**HIGH:** Both issues must be fixed before any deployment can proceed. No workarounds available - these are compilation failures.

**Estimated Effort:**
- Insurance type fix: 15-30 minutes (find correct field name or add to type)
- ChecklistItem type fix: 30-60 minutes (requires understanding domain model)

---

**Created:** 2026-02-11
**Blocking:** Wave 5 Deployment
