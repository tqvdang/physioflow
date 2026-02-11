# Quick Start Guide - Mobile E2E Tests

## Setup (One-time)

### 1. Install dependencies
```bash
cd /home/dang/dev/physioflow
pnpm install
```

### 2. iOS Setup (macOS only)
```bash
# Install applesimutils for iOS simulator control
brew tap wix/brew
brew install applesimutils

# List available simulators
xcrun simctl list devices available
```

### 3. Android Setup
```bash
# Ensure Android SDK and emulator are set up
# Create AVD if not exists:
# Android Studio > Device Manager > Create Virtual Device
# Recommended: Pixel 5 API 31

# List available AVDs
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_31 &
```

---

## Running Tests

### iOS (Recommended for Development)

**First time:**
```bash
cd apps/mobile
pnpm test:e2e:build:ios
pnpm test:e2e:ios
```

**Subsequent runs:**
```bash
cd apps/mobile
pnpm test:e2e:ios
```

**Run specific test:**
```bash
cd apps/mobile
pnpm detox test __tests__/e2e/insurance.e2e.ts --configuration ios.sim.debug
```

### Android

**First time:**
```bash
cd apps/mobile
pnpm test:e2e:build:android
pnpm test:e2e:android
```

**Subsequent runs:**
```bash
cd apps/mobile
pnpm test:e2e:android
```

---

## Quick Test Verification

### Run a single fast test
```bash
cd apps/mobile
pnpm detox test __tests__/e2e/insurance.e2e.ts -o 'should create insurance card offline' --configuration ios.sim.debug
```

### Check if Detox is working
```bash
cd apps/mobile
pnpm detox test __tests__/e2e/helpers.ts --configuration ios.sim.debug
```

---

## Troubleshooting

### "App not installed"
```bash
# Rebuild the app
cd apps/mobile
pnpm test:e2e:build:ios
# or
pnpm test:e2e:build:android
```

### "Simulator not found"
```bash
# iOS: List simulators
xcrun simctl list devices available

# Update .detoxrc.js with your simulator name
# Default is "iPhone 15 Pro"
```

### "Element not found"
**Add testID props to components:**
```tsx
// Before
<Button onPress={handleSave}>Save</Button>

// After
<Button testID="save-button" onPress={handleSave}>Save</Button>
```

### "Test timeout"
```bash
# Increase timeout in jest.config.js
testTimeout: 300000  // 5 minutes
```

### Tests are flaky
```bash
# Run with debug mode
pnpm detox test --configuration ios.sim.debug --debug-synchronization

# Record video to see what's happening
pnpm detox test --configuration ios.sim.debug --record-videos all
```

---

## File Structure

```
apps/mobile/__tests__/e2e/
├── README.md                    # Detailed documentation
├── QUICKSTART.md               # This file
├── TEST_SUMMARY.md             # Test coverage summary
├── jest.config.js              # Jest configuration
├── helpers.ts                  # Reusable test helpers
├── insurance.e2e.ts            # Insurance module tests
├── outcome-measures.e2e.ts     # Outcome measures tests
├── billing.e2e.ts              # Billing module tests
├── protocols.e2e.ts            # Protocols module tests
├── discharge.e2e.ts            # Discharge module tests
└── sync-queue.e2e.ts           # Sync queue tests
```

---

## Test Execution Order

Recommended order for first-time execution:

1. **Insurance** - Basic CRUD operations
2. **Outcome Measures** - Chart rendering
3. **Billing** - Payment workflows
4. **Protocols** - Download functionality
5. **Discharge** - PDF generation
6. **Sync Queue** - Advanced sync scenarios

---

## Common Commands

```bash
# Run all tests
pnpm test:e2e:ios

# Run specific module
pnpm detox test __tests__/e2e/billing.e2e.ts --configuration ios.sim.debug

# Run with video recording
pnpm detox test --record-videos all --configuration ios.sim.debug

# Run with screenshots on failure
pnpm detox test --take-screenshots failing --configuration ios.sim.debug

# Debug mode
pnpm detox test --debug-synchronization --configuration ios.sim.debug

# Reuse app (faster)
pnpm detox test --reuse --configuration ios.sim.debug

# Clean and rebuild
pnpm detox clean-framework-cache && pnpm test:e2e:build:ios
```

---

## Before Running Tests

1. **Start backend services:**
```bash
cd /home/dang/dev/physioflow
make dev-local  # Start PostgreSQL, Redis, Keycloak, etc.
```

2. **Verify API is running:**
```bash
curl http://localhost:7011/health
# Should return: {"status":"ok"}
```

3. **Verify Keycloak is accessible:**
```bash
curl http://localhost:7014
# Should return HTML
```

4. **Seed test data (if needed):**
```bash
cd /home/dang/dev/physioflow
make seed
```

---

## Success Indicators

After running tests, you should see:
```
PASS __tests__/e2e/insurance.e2e.ts
  Mobile Insurance Module
    Offline Insurance Creation
      ✓ should create insurance card offline (5234ms)
      ✓ should sync insurance card when coming online (7821ms)
    BHYT Card Validation
      ✓ should validate BHYT card locally (offline) (3456ms)
      ✓ should validate BHYT card with API (online) (4567ms)
    ...

Test Suites: 6 passed, 6 total
Tests:       545 passed, 545 total
Time:        342.567s
```

---

## Next Steps After Setup

1. **Run full test suite** to verify everything works
2. **Add testID props** to any missing components
3. **Configure CI/CD** pipeline
4. **Set up test data fixtures**
5. **Document any custom test scenarios**

---

## Getting Help

- Check `README.md` for detailed documentation
- See `TEST_SUMMARY.md` for coverage details
- Review `helpers.ts` for available utilities
- Consult [Detox docs](https://wix.github.io/Detox/)

---

## Key Files to Modify

### Add testID to components:
```typescript
// apps/mobile/components/YourComponent.tsx
<TouchableOpacity testID="your-button-id">
  ...
</TouchableOpacity>
```

### Update test data:
```typescript
// __tests__/e2e/helpers.ts
export const TEST_USER = {
  email: 'therapist1@physioflow.local',
  password: 'Therapist@123',
};
```

### Adjust timeouts:
```javascript
// __tests__/e2e/jest.config.js
module.exports = {
  testTimeout: 120000, // Adjust as needed
};
```

---

**Ready to test!** Run `pnpm test:e2e:ios` to start.
