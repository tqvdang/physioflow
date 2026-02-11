import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Mobile Outcome Measures Module', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Login
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

  describe('Record Measure Offline', () => {
    it('should record outcome measure offline', async () => {
      // Navigate to patient
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();

      // Go to outcome measures tab
      await element(by.id('outcome-measures-tab')).tap();

      // Disconnect from network
      await device.setURLBlacklist(['*']);

      // Tap record new measurement
      await element(by.id('record-measure-button')).tap();

      // Select measure type (NPRS)
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS - Numeric Pain Rating Scale')).tap();

      // Fill in scores
      await element(by.id('current-score-input')).typeText('4');
      await element(by.id('baseline-score-input')).typeText('8');
      await element(by.id('target-score-input')).typeText('2');

      // Select phase
      await element(by.id('phase-interim')).tap();

      // Add notes
      await element(by.id('notes-input')).typeText('Patient reports significant improvement in morning pain');

      // Save measurement
      await element(by.id('save-measure-button')).tap();

      // Verify offline indicator
      await waitFor(element(by.id('offline-indicator')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify unsynced badge
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify measurement appears in list
      await detoxExpect(element(by.text('NPRS'))).toBeVisible();
      await detoxExpect(element(by.text('4'))).toBeVisible();
    });

    it('should record multiple measure types offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Record NPRS
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS')).tap();
      await element(by.id('current-score-input')).typeText('5');
      await element(by.id('baseline-score-input')).typeText('9');
      await element(by.id('target-score-input')).typeText('2');
      await element(by.id('save-measure-button')).tap();
      await element(by.id('back-button')).tap();

      // Record LEFS
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('LEFS - Lower Extremity Functional Scale')).tap();
      await element(by.id('current-score-input')).typeText('45');
      await element(by.id('baseline-score-input')).typeText('30');
      await element(by.id('target-score-input')).typeText('60');
      await element(by.id('save-measure-button')).tap();

      // Verify both measures appear
      await detoxExpect(element(by.text('NPRS'))).toBeVisible();
      await detoxExpect(element(by.text('LEFS'))).toBeVisible();

      // Verify sync count
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('2');
    });
  });

  describe('View Progress Chart', () => {
    it('should view progress chart with offline data', async () => {
      // Assume patient has existing measures
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Tap on a measure to view details
      await element(by.id('measure-nprs-0')).tap();

      // Verify progress chart is displayed
      await detoxExpect(element(by.id('progress-chart'))).toBeVisible();

      // Verify chart shows baseline
      await detoxExpect(element(by.id('baseline-marker'))).toBeVisible();

      // Verify chart shows current
      await detoxExpect(element(by.id('current-marker'))).toBeVisible();

      // Verify chart shows target
      await detoxExpect(element(by.id('target-marker'))).toBeVisible();

      // Verify progress percentage
      await detoxExpect(element(by.id('progress-percentage'))).toBeVisible();

      // Verify MCID indicator
      await detoxExpect(element(by.id('mcid-indicator'))).toBeVisible();
    });

    it('should display chart legend correctly', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();
      await element(by.id('measure-nprs-0')).tap();

      // Verify legend items
      await detoxExpect(element(by.text('Baseline'))).toBeVisible();
      await detoxExpect(element(by.text('Current'))).toBeVisible();
      await detoxExpect(element(by.text('Target'))).toBeVisible();
      await detoxExpect(element(by.text('MCID Threshold'))).toBeVisible();
    });

    it('should show clinically significant improvement indicator', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Find measure with MCID improvement
      await element(by.id('measure-nprs-0')).tap();

      // Verify MCID badge if improvement meets threshold
      await detoxExpect(element(by.id('mcid-achieved-badge'))).toBeVisible();
      await detoxExpect(element(by.text('Clinically Significant'))).toBeVisible();
    });
  });

  describe('Sync Measurements', () => {
    it('should sync measurements when online', async () => {
      // Create offline measurements
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Record measure
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS')).tap();
      await element(by.id('current-score-input')).typeText('3');
      await element(by.id('baseline-score-input')).typeText('7');
      await element(by.id('target-score-input')).typeText('1');
      await element(by.id('save-measure-button')).tap();

      // Verify unsynced
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Reconnect
      await device.setURLBlacklist([]);

      // Trigger sync
      await element(by.id('sync-button')).tap();

      // Wait for sync
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify unsynced badge gone
      await detoxExpect(element(by.id('unsynced-badge'))).not.toBeVisible();
    });

    it('should handle sync errors gracefully', async () => {
      // Create measurement
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS')).tap();
      await element(by.id('current-score-input')).typeText('6');
      await element(by.id('baseline-score-input')).typeText('8');
      await element(by.id('target-score-input')).typeText('3');
      await element(by.id('save-measure-button')).tap();

      // Simulate partial connectivity (blacklist API endpoint)
      await device.setURLBlacklist(['*/outcome-measures']);

      // Attempt sync
      await element(by.id('sync-button')).tap();

      // Verify error notification
      await waitFor(element(by.id('sync-error-notification')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify item still marked as unsynced
      await detoxExpect(element(by.id('unsynced-badge'))).toBeVisible();

      // Verify retry option available
      await detoxExpect(element(by.id('retry-sync-button'))).toBeVisible();
    });

    it('should auto-sync on network restore', async () => {
      // Create offline measurement
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('ODI - Oswestry Disability Index')).tap();
      await element(by.id('current-score-input')).typeText('35');
      await element(by.id('baseline-score-input')).typeText('55');
      await element(by.id('target-score-input')).typeText('20');
      await element(by.id('save-measure-button')).tap();

      // Reconnect (should trigger auto-sync)
      await device.setURLBlacklist([]);

      // Wait for auto-sync to complete
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(15000);

      await detoxExpect(element(by.id('unsynced-badge'))).not.toBeVisible();
    });
  });

  describe('Offline Indicator Display', () => {
    it('should display offline indicator in list view', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Verify offline banner in list view
      await waitFor(element(by.id('offline-banner')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text('You are offline'))).toBeVisible();
    });

    it('should display offline indicator in form', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      await element(by.id('record-measure-button')).tap();

      // Verify offline indicator in form header
      await detoxExpect(element(by.id('form-offline-indicator'))).toBeVisible();
      await detoxExpect(element(by.text('Working offline'))).toBeVisible();
    });

    it('should show sync status per measurement', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Assume mix of synced and unsynced measures
      // Verify synced item has checkmark
      await detoxExpect(element(by.id('measure-synced-0'))).toBeVisible();

      // Disconnect and create new
      await device.setURLBlacklist(['*']);
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS')).tap();
      await element(by.id('current-score-input')).typeText('5');
      await element(by.id('baseline-score-input')).typeText('7');
      await element(by.id('target-score-input')).typeText('2');
      await element(by.id('save-measure-button')).tap();

      // Verify unsynced item has pending icon
      await detoxExpect(element(by.id('measure-unsynced-1'))).toBeVisible();
    });

    it('should update sync status after successful sync', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      // Create offline
      await device.setURLBlacklist(['*']);
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('TUG - Timed Up and Go')).tap();
      await element(by.id('current-score-input')).typeText('12.5');
      await element(by.id('baseline-score-input')).typeText('18.0');
      await element(by.id('target-score-input')).typeText('10.0');
      await element(by.id('save-measure-button')).tap();

      // Verify pending status
      await detoxExpect(element(by.id('measure-unsynced-0'))).toBeVisible();

      // Reconnect and sync
      await device.setURLBlacklist([]);
      await element(by.id('sync-button')).tap();

      // Wait and verify status changed to synced
      await waitFor(element(by.id('measure-synced-0')))
        .toBeVisible()
        .withTimeout(10000);

      await detoxExpect(element(by.id('measure-unsynced-0'))).not.toBeVisible();
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate score ranges offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('record-measure-button')).tap();

      // Select NPRS (0-10 range)
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS')).tap();

      // Enter invalid score (out of range)
      await element(by.id('current-score-input')).typeText('15');
      await element(by.id('save-measure-button')).tap();

      // Verify validation error
      await detoxExpect(element(by.text('Score must be between 0 and 10'))).toBeVisible();

      // Fix and save
      await element(by.id('current-score-input')).clearText();
      await element(by.id('current-score-input')).typeText('7');
      await element(by.id('baseline-score-input')).typeText('9');
      await element(by.id('target-score-input')).typeText('3');
      await element(by.id('save-measure-button')).tap();

      // Verify saved
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should require all mandatory fields', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();

      await element(by.id('record-measure-button')).tap();

      // Try to save without filling fields
      await element(by.id('save-measure-button')).tap();

      // Verify validation errors
      await detoxExpect(element(by.text('Please select a measure type'))).toBeVisible();
    });
  });
});
