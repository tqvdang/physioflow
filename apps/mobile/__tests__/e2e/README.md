# PhysioFlow Mobile E2E Tests

End-to-end tests for the PhysioFlow React Native mobile app using Detox.

## Test Coverage

### 1. Insurance Module (`insurance.e2e.ts`)
- Create insurance card offline
- Sync insurance card when coming online
- Validate BHYT card locally (offline)
- Validate BHYT card with API (online)
- Resolve sync conflicts (server/client/cancel)
- Network state transitions
- Queue multiple operations offline

### 2. Outcome Measures Module (`outcome-measures.e2e.ts`)
- Record outcome measure offline
- View progress chart
- Sync measurements when online
- Offline indicator display
- Multiple measure types (NPRS, LEFS, ODI, TUG, etc.)
- MCID tracking and clinically significant improvement
- Validation and error handling

### 3. Billing Module (`billing.e2e.ts`)
- Create invoice offline
- Select service codes from picker
- Record payment offline
- Sync payments when online
- Invoice status updates
- Currency formatting (VND)
- Payment history

### 4. Protocols Module (`protocols.e2e.ts`)
- Download protocol for offline access
- Assign protocol to patient
- Complete exercise session offline
- Track exercise modifications
- Record pain levels during exercises
- Sync progress when online
- Storage management

### 5. Discharge Module (`discharge.e2e.ts`)
- Create discharge plan offline
- Generate discharge summary offline
- Export PDF and share
- Sync summary when online
- HEP (Home Exercise Program) management
- Outcome comparison table
- Network transitions

## Prerequisites

### iOS
```bash
# Install Xcode (from App Store)
# Install Xcode Command Line Tools
xcode-select --install

# Install applesimutils
brew tap wix/brew
brew install applesimutils
```

### Android
```bash
# Install Android Studio
# Set up Android SDK
# Create an AVD (Android Virtual Device)

# Add to ~/.bashrc or ~/.zshrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Setup

1. **Install dependencies**
```bash
cd apps/mobile
pnpm install
```

2. **Build the app**

iOS:
```bash
pnpm detox build --configuration ios.sim.debug
```

Android:
```bash
pnpm detox build --configuration android.emu.debug
```

## Running Tests

### Run all E2E tests

iOS Simulator:
```bash
pnpm test:e2e:ios
```

Android Emulator:
```bash
pnpm test:e2e:android
```

### Run specific test file

```bash
# iOS
pnpm detox test __tests__/e2e/insurance.e2e.ts --configuration ios.sim.debug

# Android
pnpm detox test __tests__/e2e/billing.e2e.ts --configuration android.emu.debug
```

### Run with additional options

```bash
# Reuse existing app build (faster)
pnpm detox test --configuration ios.sim.debug --reuse

# Run in headed mode (see the app)
pnpm detox test --configuration ios.sim.debug --debug-synchronization

# Record video
pnpm detox test --configuration ios.sim.debug --record-videos all

# Take screenshots on failure
pnpm detox test --configuration ios.sim.debug --take-screenshots failing
```

## Test Patterns

### Basic Test Structure
```typescript
describe('Module Name', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await login();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should do something', async () => {
    // Test code
  });
});
```

### Offline Testing Pattern
```typescript
// Go offline
await device.setURLBlacklist(['*']);

// Perform offline action
await element(by.id('save-button')).tap();

// Verify offline indicator
await waitFor(element(by.id('offline-indicator')))
  .toBeVisible()
  .withTimeout(2000);

// Go back online
await device.setURLBlacklist([]);

// Trigger sync
await element(by.id('sync-button')).tap();

// Verify sync complete
await waitFor(element(by.id('synced-badge')))
  .toBeVisible()
  .withTimeout(10000);
```

### Element Matching
```typescript
// By testID (preferred)
element(by.id('button-id'))

// By text
element(by.text('Button Text'))

// By label
element(by.label('Accessible Label'))

// By type
element(by.type('RCTTextInput'))

// Nested elements
element(by.id('parent')).atIndex(0)
```

### Assertions
```typescript
// Visibility
await detoxExpect(element(by.id('element'))).toBeVisible();
await detoxExpect(element(by.id('element'))).not.toBeVisible();

// Existence
await detoxExpect(element(by.id('element'))).toExist();

// Text
await detoxExpect(element(by.id('label'))).toHaveText('Expected Text');

// Value
await detoxExpect(element(by.id('input'))).toHaveValue('Expected Value');
```

### Waiting
```typescript
// Wait for element to appear
await waitFor(element(by.id('element')))
  .toBeVisible()
  .withTimeout(5000);

// Wait for element to disappear
await waitFor(element(by.id('loading')))
  .not.toBeVisible()
  .withTimeout(10000);

// Wait while scrolling
await waitFor(element(by.id('element')))
  .toBeVisible()
  .whileElement(by.id('scrollView'))
  .scroll(200, 'down');
```

## Helper Functions

See `helpers.ts` for reusable test utilities:

- `login()` - Login with test credentials
- `goOffline()` / `goOnline()` - Network control
- `triggerSync()` - Trigger sync
- `navigateToPatient()` - Navigate to patient detail
- `verifyOfflineIndicator()` - Check offline status
- `resolveSyncConflict()` - Handle sync conflicts

## Test Data

Test data should be set up using:
1. Database seeds for consistent initial state
2. API mocks for predictable responses
3. Local fixtures for offline scenarios

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests (iOS)
  run: |
    cd apps/mobile
    pnpm detox build --configuration ios.sim.debug
    pnpm detox test --configuration ios.sim.debug --cleanup
```

### GitLab CI Example
```yaml
test:e2e:ios:
  script:
    - cd apps/mobile
    - pnpm detox build --configuration ios.sim.debug
    - pnpm detox test --configuration ios.sim.debug --cleanup
  artifacts:
    paths:
      - apps/mobile/artifacts/
```

## Debugging

### Enable debug logs
```bash
pnpm detox test --configuration ios.sim.debug --loglevel trace
```

### Run single test with debugger
```bash
pnpm detox test __tests__/e2e/insurance.e2e.ts --configuration ios.sim.debug --debug-synchronization
```

### Common Issues

**Issue: App doesn't launch**
- Ensure simulator/emulator is running
- Rebuild the app: `pnpm detox build`
- Check app bundle ID matches configuration

**Issue: Elements not found**
- Verify testID props are added to components
- Use `--debug-synchronization` to see element tree
- Check for timing issues (add waitFor)

**Issue: Tests flaky**
- Increase timeouts for slow operations
- Add explicit waits before assertions
- Disable animations in app for tests

**Issue: Network mocking not working**
- Verify URL blacklist patterns
- Check that app respects network state
- Use actual offline mode on device if needed

## Best Practices

1. **Use testID consistently** - Add testID to all interactive elements
2. **Avoid hardcoded waits** - Use `waitFor()` instead of `sleep()`
3. **Test offline-first** - Verify offline functionality before online
4. **Clean state** - Reset app state between tests
5. **Group related tests** - Use describe blocks for organization
6. **Mock API responses** - Use consistent test data
7. **Handle async properly** - Always await async operations
8. **Write descriptive test names** - Clearly state what is being tested
9. **Test error cases** - Don't just test happy paths
10. **Keep tests independent** - Tests should not depend on each other

## Target Coverage

- 100% of critical offline workflows
- All sync conflict scenarios
- Network transition edge cases
- Data validation and error handling
- User-facing error messages

## Maintenance

- Update tests when UI changes
- Add tests for new features
- Remove obsolete tests
- Keep helper functions DRY
- Document non-obvious test scenarios
