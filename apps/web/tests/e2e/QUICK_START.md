# E2E Tests Quick Start

## Run All Tests

```bash
cd /home/dang/dev/physioflow/apps/web
pnpm test:e2e
```

## Run Specific Feature Tests

```bash
# Insurance
pnpm test:e2e insurance.spec.ts

# Outcome Measures
pnpm test:e2e outcome-measures.spec.ts

# Billing
pnpm test:e2e billing.spec.ts

# Protocols
pnpm test:e2e protocols.spec.ts

# Discharge
pnpm test:e2e discharge.spec.ts
```

## Run Quality Tests

```bash
# Internationalization
pnpm test:e2e i18n.spec.ts

# Accessibility (WCAG 2.1 AA)
pnpm test:e2e accessibility.spec.ts

# Responsive Design
pnpm test:e2e responsive.spec.ts
```

## Interactive Modes

```bash
# UI Mode (best for development)
pnpm test:e2e:ui

# Headed Mode (watch browser)
pnpm test:e2e:headed

# Debug Mode (step through)
pnpm test:e2e:debug
```

## Run Single Test

```bash
pnpm test:e2e insurance.spec.ts -g "should create insurance card"
```

## Prerequisites

```bash
# Start infrastructure and app
cd /home/dang/dev/physioflow
make dev-local
cd apps/web && pnpm dev

# Or use Docker
make dev
```

## Test Structure

```
tests/e2e/
├── insurance.spec.ts           # BHYT insurance cards
├── outcome-measures.spec.ts    # VAS/NPRS tracking
├── billing.spec.ts             # Invoicing & payments
├── protocols.spec.ts           # Clinical protocols
├── discharge.spec.ts           # Discharge planning
├── i18n.spec.ts               # Vietnamese/English
├── accessibility.spec.ts       # WCAG 2.1 AA
├── responsive.spec.ts          # Mobile/Tablet/Desktop
├── auth.spec.ts               # Authentication (existing)
├── patients.spec.ts           # Patient management (existing)
├── schedule.spec.ts           # Scheduling (existing)
├── checklist.spec.ts          # Visit workflow (existing)
└── exercises.spec.ts          # Exercise library (existing)
```

## View Reports

```bash
pnpm exec playwright show-report
```

## Debugging Failed Tests

```bash
# View screenshots in test-results/
ls test-results/

# Run with trace
pnpm test:e2e --trace on

# View trace
pnpm exec playwright show-trace trace.zip
```

## CI/CD

Tests run automatically in GitHub Actions on:
- Pull requests
- Main branch pushes
- Manual workflow dispatch

## Coverage

- 130+ tests
- 100% critical paths
- WCAG 2.1 AA compliant
- Mobile, tablet, desktop
- Vietnamese + English

## Need Help?

- See `README.md` for detailed documentation
- See `TEST_COVERAGE.md` for coverage matrix
- Check Playwright docs: https://playwright.dev
