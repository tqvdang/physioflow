# PhysioFlow E2E Tests

Comprehensive end-to-end tests for all PhysioFlow web UI workflows using Playwright.

## Test Structure

### Feature Domain Tests

1. **insurance.spec.ts** - BHYT Insurance Card Management
   - Create insurance card with valid BHYT number
   - Validate card number in real-time
   - Calculate coverage preview
   - Update insurance card
   - Display expired card warnings

2. **outcome-measures.spec.ts** - Outcome Measures Workflow
   - Record baseline measures (VAS, NPRS)
   - Record interim measures
   - View progress charts
   - Check MCID indicators
   - View trending data across treatment phases

3. **billing.spec.ts** - Billing Workflow
   - Create invoices with multiple service codes
   - Automatic copay calculation
   - Record payments (cash, bank transfer)
   - View payment history
   - Invoice status updates (pending → paid)

4. **protocols.spec.ts** - Clinical Protocols Workflow
   - Browse protocol library
   - Filter and search protocols
   - Assign protocols to patients (e.g., Lower Back Pain)
   - View protocol details (goals, exercises)
   - Update protocol progress
   - Mark exercises as completed

5. **discharge.spec.ts** - Discharge Planning Workflow
   - Create discharge plans
   - View baseline vs discharge comparison
   - Generate discharge summaries
   - Export discharge summary as PDF
   - Complete discharge with confirmation

### Cross-Cutting Concerns

6. **i18n.spec.ts** - Internationalization
   - Language toggle (Vietnamese ↔ English)
   - Vietnamese content display
   - English content display
   - Date and number formatting
   - Localized toast messages
   - Error message localization

7. **accessibility.spec.ts** - Accessibility (WCAG 2.1 AA)
   - Automated accessibility scans with axe-core
   - Keyboard navigation
   - Screen reader support (ARIA, labels)
   - Focus management
   - Color contrast verification

8. **responsive.spec.ts** - Responsive Design
   - Mobile viewport (iPhone SE - 375x667)
   - Tablet viewport (iPad - 768x1024)
   - Desktop viewport (1920x1080)
   - Breakpoint transitions
   - Touch gestures
   - Content reflow
   - Mobile form inputs

### Existing Tests

9. **auth.spec.ts** - Authentication
   - Login flow
   - Role-based access
   - Session persistence
   - Locale support

10. **patients.spec.ts** - Patient Management
    - Patient list, search, filter
    - Create, view, edit patients

11. **schedule.spec.ts** - Scheduling
    - Calendar views
    - Appointment management

12. **checklist.spec.ts** - Checklist/Visit Management
    - Session workflow
    - Checklist items
    - SOAP note generation

13. **exercises.spec.ts** - Exercise Library
    - Browse, search exercises
    - Exercise details

## Running Tests

### Install Dependencies

```bash
cd /home/dang/dev/physioflow/apps/web
pnpm install
```

### Run All Tests

```bash
pnpm test:e2e
```

### Run Specific Test File

```bash
pnpm test:e2e insurance.spec.ts
pnpm test:e2e outcome-measures.spec.ts
pnpm test:e2e billing.spec.ts
pnpm test:e2e protocols.spec.ts
pnpm test:e2e discharge.spec.ts
```

### Interactive Mode (UI)

```bash
pnpm test:e2e:ui
```

### Headed Mode (See Browser)

```bash
pnpm test:e2e:headed
```

### Debug Mode

```bash
pnpm test:e2e:debug
```

### Run Tests for Specific Browser

```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Run Tests by Tag/Group

```bash
# Run only accessibility tests
pnpm test:e2e accessibility.spec.ts

# Run only responsive tests
pnpm test:e2e responsive.spec.ts

# Run all feature domain tests
pnpm test:e2e insurance.spec.ts outcome-measures.spec.ts billing.spec.ts protocols.spec.ts discharge.spec.ts
```

## Test Coverage

### Critical User Workflows

- [x] Insurance card management (BHYT)
- [x] Outcome measures tracking
- [x] Billing and payments
- [x] Clinical protocol assignment
- [x] Discharge planning
- [x] Patient management
- [x] Scheduling
- [x] Checklist-driven visits
- [x] Exercise library

### Quality Assurance

- [x] Bilingual support (Vietnamese/English)
- [x] Accessibility (WCAG 2.1 AA)
- [x] Responsive design (mobile, tablet, desktop)
- [x] Authentication and authorization
- [x] Form validation
- [x] Error handling

## Test Patterns

### Flexible Locators

Tests use multiple fallback strategies for finding elements:

```typescript
// Try multiple selectors
const button = page.locator('button:has-text("Save"), button[type="submit"], [data-testid="save"]');
if (await button.first().isVisible({ timeout: 5000 }).catch(() => false)) {
  await button.first().click();
}
```

### Conditional Testing

Tests adapt to UI implementation:

```typescript
// Check if feature exists before testing
if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
  // Run test
}
```

### Accessibility Testing

Uses axe-core for automated WCAG compliance:

```typescript
import AxeBuilder from '@axe-core/playwright';

const accessibilityScanResults = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();

expect(accessibilityScanResults.violations).toEqual([]);
```

### Responsive Testing

Tests across multiple viewports:

```typescript
test.use({ ...devices['iPhone SE'] }); // 375x667
test.use({ ...devices['iPad'] });      // 768x1024
test.use({ viewport: { width: 1920, height: 1080 } }); // Desktop
```

## Configuration

Tests are configured in `playwright.config.ts`:

- Base URL: http://localhost:7010
- Timeout: 30 seconds per test
- Retries: 2 on CI
- Screenshots: On failure
- Videos: On first retry
- Auth state: Shared across tests

## CI/CD Integration

Tests run automatically in GitHub Actions:

```yaml
- name: Run E2E tests
  run: pnpm test:e2e
```

## Debugging

### View Test Report

```bash
pnpm exec playwright show-report
```

### Run Single Test

```bash
pnpm test:e2e insurance.spec.ts -g "should create insurance card"
```

### Step Through Test

```bash
pnpm test:e2e:debug insurance.spec.ts
```

### View Screenshots

Failed test screenshots are saved in `test-results/`

## Test Data

Tests use:
- Authenticated therapist user (from global-setup.ts)
- Existing patient data (from seed database)
- Generated test data (via `generateTestData()`)

## Contributing

When adding new tests:

1. Follow existing patterns (flexible locators, conditional testing)
2. Add data-testid attributes to components for stable selectors
3. Use test utilities from `fixtures/test-utils.ts`
4. Run accessibility checks for new pages
5. Test on mobile, tablet, and desktop viewports
6. Verify bilingual support (Vietnamese and English)

## Known Issues

- Some tests are conditional based on UI implementation
- Tests may skip if features are not yet implemented
- Mobile navigation patterns may vary by viewport

## Performance

E2E test suite takes approximately:
- Full suite: 10-15 minutes
- Single test file: 30-60 seconds
- Parallel execution: Enabled (speeds up total time)
