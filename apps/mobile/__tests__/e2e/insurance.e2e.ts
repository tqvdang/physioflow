import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Mobile Insurance Module', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Login with therapist credentials
    await element(by.id('email-input')).typeText('therapist1@physioflow.local');
    await element(by.id('password-input')).typeText('Therapist@123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('patient-list')))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Offline Insurance Creation', () => {
    it('should create insurance card offline', async () => {
      // Navigate to patient list
      await element(by.id('patient-list')).tap();
      await waitFor(element(by.id('patient-item-0')))
        .toBeVisible()
        .withTimeout(3000);

      // Select first patient
      await element(by.id('patient-item-0')).tap();

      // Go to insurance tab
      await element(by.id('insurance-tab')).tap();

      // Tap add insurance button
      await element(by.id('add-insurance-button')).tap();

      // Disconnect from network
      await device.setURLBlacklist(['*']);

      // Fill insurance form
      await element(by.id('card-number-input')).typeText('HC1-2024-12345-67890');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('coverage-percent-input')).typeText('80');
      await element(by.id('copay-rate-input')).typeText('20');

      // Set valid from date (today)
      await element(by.id('valid-from-picker')).tap();
      await element(by.text('OK')).tap();

      // Set valid to date (1 year from now)
      await element(by.id('valid-to-picker')).tap();
      await element(by.text('OK')).tap();

      // Save the card
      await element(by.id('save-insurance-button')).tap();

      // Verify offline indicator is shown
      await waitFor(element(by.id('offline-indicator')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify unsynced badge is shown
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify card appears in list with offline marker
      await element(by.id('insurance-tab')).tap();
      await detoxExpect(element(by.text('HC1-2024-12345-67890'))).toBeVisible();
      await detoxExpect(element(by.id('offline-marker'))).toBeVisible();
    });

    it('should sync insurance card when coming online', async () => {
      // First create offline insurance card
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();

      // Disconnect from network
      await device.setURLBlacklist(['*']);

      // Fill and save
      await element(by.id('card-number-input')).typeText('HC2-2024-54321-09876');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('coverage-percent-input')).typeText('80');
      await element(by.id('copay-rate-input')).typeText('20');
      await element(by.id('save-insurance-button')).tap();

      // Wait for save
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Reconnect to network
      await device.setURLBlacklist([]);

      // Trigger sync
      await element(by.id('sync-button')).tap();

      // Wait for sync complete
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify offline indicator is gone
      await detoxExpect(element(by.id('offline-indicator'))).not.toBeVisible();

      // Verify unsynced badge is gone
      await detoxExpect(element(by.id('unsynced-badge'))).not.toBeVisible();
    });
  });

  describe('BHYT Card Validation', () => {
    it('should validate BHYT card locally (offline)', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();

      // Disconnect from network
      await device.setURLBlacklist(['*']);

      // Enter invalid card format
      await element(by.id('card-number-input')).typeText('INVALID');
      await element(by.id('validate-button')).tap();

      // Verify local validation error
      await waitFor(element(by.text('Invalid card format. Expected: XX9-9999-99999-99999')))
        .toBeVisible()
        .withTimeout(2000);

      // Clear and enter valid format
      await element(by.id('card-number-input')).clearText();
      await element(by.id('card-number-input')).typeText('HC1-2024-12345-67890');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('validate-button')).tap();

      // Verify local validation passes
      await waitFor(element(by.id('validation-success-icon')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should validate BHYT card with API (online)', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();

      // Ensure online
      await device.setURLBlacklist([]);

      // Enter card number
      await element(by.id('card-number-input')).typeText('HC1-2024-12345-67890');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('validate-online-button')).tap();

      // Verify API validation is triggered
      await waitFor(element(by.id('validating-spinner')))
        .toBeVisible()
        .withTimeout(2000);

      // Wait for validation result
      await waitFor(element(by.id('api-validation-result')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify verification status is updated
      await detoxExpect(element(by.id('verified-badge'))).toBeVisible();
    });
  });

  describe('Sync Conflict Resolution', () => {
    it('should resolve sync conflicts by choosing server version', async () => {
      // Create a conflict scenario by editing the same card offline and online
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();

      // Assume card already exists
      await element(by.id('insurance-card-0')).tap();
      await element(by.id('edit-button')).tap();

      // Disconnect and edit offline
      await device.setURLBlacklist(['*']);
      await element(by.id('coverage-percent-input')).clearText();
      await element(by.id('coverage-percent-input')).typeText('70');
      await element(by.id('save-insurance-button')).tap();

      // Simulate server edit by reconnecting
      await device.setURLBlacklist([]);

      // Trigger sync
      await element(by.id('sync-button')).tap();

      // Conflict modal should appear
      await waitFor(element(by.id('conflict-modal')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify conflict fields are shown
      await detoxExpect(element(by.text('Coverage Percent'))).toBeVisible();
      await detoxExpect(element(by.id('local-value-70'))).toBeVisible();
      await detoxExpect(element(by.id('server-value-80'))).toBeVisible();

      // Choose server version
      await element(by.id('use-server-button')).tap();

      // Verify server data is displayed
      await waitFor(element(by.text('80')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify conflict modal is dismissed
      await detoxExpect(element(by.id('conflict-modal'))).not.toBeVisible();
    });

    it('should resolve sync conflicts by choosing client version', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('insurance-card-0')).tap();
      await element(by.id('edit-button')).tap();

      // Disconnect and edit offline
      await device.setURLBlacklist(['*']);
      await element(by.id('copay-rate-input')).clearText();
      await element(by.id('copay-rate-input')).typeText('15');
      await element(by.id('save-insurance-button')).tap();

      // Reconnect and sync
      await device.setURLBlacklist([]);
      await element(by.id('sync-button')).tap();

      // Wait for conflict modal
      await waitFor(element(by.id('conflict-modal')))
        .toBeVisible()
        .withTimeout(5000);

      // Choose client (this device) version
      await element(by.id('use-client-button')).tap();

      // Verify client data is displayed
      await waitFor(element(by.text('15')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify sync completes with client version
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should cancel conflict resolution', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('insurance-card-0')).tap();
      await element(by.id('edit-button')).tap();

      // Create conflict
      await device.setURLBlacklist(['*']);
      await element(by.id('coverage-percent-input')).clearText();
      await element(by.id('coverage-percent-input')).typeText('75');
      await element(by.id('save-insurance-button')).tap();

      // Sync
      await device.setURLBlacklist([]);
      await element(by.id('sync-button')).tap();

      // Wait for conflict modal
      await waitFor(element(by.id('conflict-modal')))
        .toBeVisible()
        .withTimeout(5000);

      // Cancel resolution
      await element(by.id('cancel-conflict-button')).tap();

      // Verify modal is dismissed
      await detoxExpect(element(by.id('conflict-modal'))).not.toBeVisible();

      // Verify unsynced badge remains
      await detoxExpect(element(by.id('unsynced-badge'))).toBeVisible();
    });
  });

  describe('Network State Transitions', () => {
    it('should show offline banner when network is lost', async () => {
      await element(by.id('patient-list')).tap();

      // Disconnect network
      await device.setURLBlacklist(['*']);

      // Verify offline banner appears
      await waitFor(element(by.id('offline-banner')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text('You are offline'))).toBeVisible();
    });

    it('should hide offline banner when network is restored', async () => {
      // Start offline
      await device.setURLBlacklist(['*']);
      await element(by.id('patient-list')).tap();

      // Verify offline banner is shown
      await waitFor(element(by.id('offline-banner')))
        .toBeVisible()
        .withTimeout(3000);

      // Reconnect
      await device.setURLBlacklist([]);

      // Verify offline banner disappears
      await waitFor(element(by.id('offline-banner')))
        .not.toBeVisible()
        .withTimeout(5000);
    });

    it('should queue multiple operations offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Create first card
      await element(by.id('add-insurance-button')).tap();
      await element(by.id('card-number-input')).typeText('HC1-2024-11111-11111');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('save-insurance-button')).tap();

      // Go back
      await element(by.id('back-button')).tap();

      // Create second card
      await element(by.id('add-insurance-button')).tap();
      await element(by.id('card-number-input')).typeText('HC1-2024-22222-22222');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('save-insurance-button')).tap();

      // Verify sync queue count
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('2');

      // Reconnect and sync all
      await device.setURLBlacklist([]);
      await element(by.id('sync-all-button')).tap();

      // Wait for all to sync
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(15000);
    });
  });
});
