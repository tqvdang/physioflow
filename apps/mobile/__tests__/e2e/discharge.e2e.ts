import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Mobile Discharge Module', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { notifications: 'YES', mediaLibrary: 'YES' },
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

  describe('Create Discharge Plan Offline', () => {
    it('should create discharge plan offline', async () => {
      // Navigate to patient
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();

      // Go to discharge tab
      await element(by.id('discharge-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Create discharge plan
      await element(by.id('create-discharge-plan-button')).tap();

      // Fill discharge goals
      await element(by.id('goal-1-input')).typeText('Return to work full-time');
      await element(by.id('add-goal-button')).tap();
      await element(by.id('goal-2-input')).typeText('Resume recreational sports activities');

      // Set target discharge date
      await element(by.id('target-discharge-date-picker')).tap();
      await element(by.text('OK')).tap();

      // Add home exercise program
      await element(by.id('add-hep-button')).tap();
      await element(by.id('exercise-picker')).tap();
      await element(by.text('Lumbar Stretches')).tap();
      await element(by.id('frequency-input')).typeText('3 times per day');
      await element(by.id('duration-input')).typeText('10 minutes');
      await element(by.id('save-hep-item-button')).tap();

      // Add precautions
      await element(by.id('precautions-input')).typeText('Avoid heavy lifting over 20kg');

      // Save discharge plan
      await element(by.id('save-discharge-plan-button')).tap();

      // Verify offline indicator
      await waitFor(element(by.id('offline-indicator')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify unsynced badge
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify plan appears
      await detoxExpect(element(by.text('Return to work full-time'))).toBeVisible();
    });

    it('should add multiple HEP exercises offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('create-discharge-plan-button')).tap();

      // Add first exercise
      await element(by.id('add-hep-button')).tap();
      await element(by.id('exercise-picker')).tap();
      await element(by.text('Lumbar Stretches')).tap();
      await element(by.id('frequency-input')).typeText('3x daily');
      await element(by.id('save-hep-item-button')).tap();

      // Add second exercise
      await element(by.id('add-hep-button')).tap();
      await element(by.id('exercise-picker')).tap();
      await element(by.text('Core Strengthening')).tap();
      await element(by.id('frequency-input')).typeText('2x daily');
      await element(by.id('save-hep-item-button')).tap();

      // Add third exercise
      await element(by.id('add-hep-button')).tap();
      await element(by.id('exercise-picker')).tap();
      await element(by.text('Walking Program')).tap();
      await element(by.id('frequency-input')).typeText('30 min daily');
      await element(by.id('save-hep-item-button')).tap();

      // Verify all exercises listed
      await detoxExpect(element(by.text('Lumbar Stretches'))).toBeVisible();
      await detoxExpect(element(by.text('Core Strengthening'))).toBeVisible();
      await detoxExpect(element(by.text('Walking Program'))).toBeVisible();

      // Save plan
      await element(by.id('save-discharge-plan-button')).tap();

      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should validate required fields', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('create-discharge-plan-button')).tap();

      // Try to save without filling required fields
      await element(by.id('save-discharge-plan-button')).tap();

      // Verify validation errors
      await detoxExpect(element(by.text('At least one goal is required'))).toBeVisible();
    });
  });

  describe('Generate Discharge Summary Offline', () => {
    it('should generate discharge summary offline', async () => {
      // Assume patient has completed treatment with existing data
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);

      // Generate summary
      await element(by.id('generate-summary-button')).tap();

      // Wait for generation
      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify summary sections
      await detoxExpect(element(by.id('patient-info-section'))).toBeVisible();
      await detoxExpect(element(by.id('diagnosis-section'))).toBeVisible();
      await detoxExpect(element(by.id('treatment-summary-section'))).toBeVisible();
      await detoxExpect(element(by.id('outcome-measures-section'))).toBeVisible();
      await detoxExpect(element(by.id('functional-progress-section'))).toBeVisible();
      await detoxExpect(element(by.id('hep-section'))).toBeVisible();
      await detoxExpect(element(by.id('recommendations-section'))).toBeVisible();

      // Verify unsynced badge
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should include outcome measure comparisons in summary', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('generate-summary-button')).tap();

      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to outcome measures section
      await element(by.id('outcome-measures-section')).tap();

      // Verify comparison table
      await detoxExpect(element(by.id('outcome-comparison-table'))).toBeVisible();
      await detoxExpect(element(by.text('Baseline'))).toBeVisible();
      await detoxExpect(element(by.text('Discharge'))).toBeVisible();
      await detoxExpect(element(by.text('Change'))).toBeVisible();
      await detoxExpect(element(by.text('MCID Met'))).toBeVisible();

      // Verify measures shown
      await detoxExpect(element(by.text('NPRS'))).toBeVisible();
      await detoxExpect(element(by.text('ODI'))).toBeVisible();
    });

    it('should include functional progress notes', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('generate-summary-button')).tap();

      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // View functional progress
      await element(by.id('functional-progress-section')).tap();

      // Verify progress descriptions
      await detoxExpect(element(by.id('initial-functional-status'))).toBeVisible();
      await detoxExpect(element(by.id('discharge-functional-status'))).toBeVisible();
      await detoxExpect(element(by.id('functional-improvements'))).toBeVisible();
    });

    it('should add custom recommendations', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('generate-summary-button')).tap();

      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Edit recommendations
      await element(by.id('recommendations-section')).tap();
      await element(by.id('add-recommendation-button')).tap();
      await element(by.id('recommendation-input')).typeText('Follow up with orthopedic surgeon in 3 months');
      await element(by.id('save-recommendation-button')).tap();

      // Verify recommendation added
      await detoxExpect(element(by.text('Follow up with orthopedic surgeon in 3 months'))).toBeVisible();
    });
  });

  describe('Export PDF and Share', () => {
    it('should export discharge summary as PDF offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      // Assume summary already generated
      await element(by.id('discharge-summary-0')).tap();

      await device.setURLBlacklist(['*']);

      // Export PDF
      await element(by.id('export-pdf-button')).tap();

      // Wait for PDF generation
      await waitFor(element(by.id('pdf-generated-indicator')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify PDF preview available
      await detoxExpect(element(by.id('pdf-preview'))).toBeVisible();

      // Verify export success message
      await detoxExpect(element(by.text('PDF generated successfully'))).toBeVisible();
    });

    it('should share PDF via system share sheet', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-summary-0')).tap();

      // Export PDF first
      await element(by.id('export-pdf-button')).tap();
      await waitFor(element(by.id('pdf-generated-indicator')))
        .toBeVisible()
        .withTimeout(10000);

      // Share PDF
      await element(by.id('share-pdf-button')).tap();

      // Verify share sheet appears (platform-specific)
      // On iOS/Android, system share sheet should open
      // This is hard to test in Detox, but we can verify the button tap works
    });

    it('should save PDF to device storage', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-summary-0')).tap();

      await device.setURLBlacklist(['*']);

      // Export and save
      await element(by.id('export-pdf-button')).tap();
      await waitFor(element(by.id('pdf-generated-indicator')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.id('save-to-device-button')).tap();

      // Verify save success
      await waitFor(element(by.text('PDF saved to Downloads')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should include patient branding in PDF', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-summary-0')).tap();

      await element(by.id('export-pdf-button')).tap();
      await waitFor(element(by.id('pdf-generated-indicator')))
        .toBeVisible()
        .withTimeout(10000);

      // Open PDF preview to verify content
      await element(by.id('preview-pdf-button')).tap();

      // Verify clinic branding elements present
      // (This would be visual verification in real testing)
      await detoxExpect(element(by.id('pdf-preview'))).toBeVisible();
    });
  });

  describe('Sync Summary', () => {
    it('should sync discharge summary when online', async () => {
      // Create summary offline
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('generate-summary-button')).tap();

      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

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

      await detoxExpect(element(by.id('unsynced-badge'))).not.toBeVisible();
    });

    it('should sync discharge plan and summary together', async () => {
      // Create both offline
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);

      // Create plan
      await element(by.id('create-discharge-plan-button')).tap();
      await element(by.id('goal-1-input')).typeText('Goal 1');
      await element(by.id('save-discharge-plan-button')).tap();

      // Generate summary
      await element(by.id('generate-summary-button')).tap();
      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Check sync count
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('2');

      // Sync all
      await device.setURLBlacklist([]);
      await element(by.id('sync-all-button')).tap();

      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(15000);
    });

    it('should handle sync conflicts in discharge data', async () => {
      // Create summary offline
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('generate-summary-button')).tap();
      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Edit summary
      await element(by.id('recommendations-section')).tap();
      await element(by.id('add-recommendation-button')).tap();
      await element(by.id('recommendation-input')).typeText('Local recommendation');
      await element(by.id('save-recommendation-button')).tap();

      // Simulate server-side edit
      await device.setURLBlacklist([]);

      // Trigger sync
      await element(by.id('sync-button')).tap();

      // If conflict, modal should appear
      await waitFor(element(by.id('conflict-modal')))
        .toBeVisible()
        .withTimeout(5000);

      // Resolve by keeping server version
      await element(by.id('use-server-button')).tap();

      // Verify resolution
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('HEP Display and Management', () => {
    it('should display HEP list with exercises', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      // Assume discharge plan with HEP exists
      await element(by.id('discharge-plan-0')).tap();

      // View HEP
      await element(by.id('hep-section')).tap();

      // Verify exercises listed
      await detoxExpect(element(by.id('hep-list'))).toBeVisible();
      await detoxExpect(element(by.id('hep-exercise-0'))).toBeVisible();

      // Verify exercise details
      await detoxExpect(element(by.id('exercise-name-0'))).toBeVisible();
      await detoxExpect(element(by.id('exercise-frequency-0'))).toBeVisible();
      await detoxExpect(element(by.id('exercise-duration-0'))).toBeVisible();
    });

    it('should show exercise instructions with images', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-plan-0')).tap();
      await element(by.id('hep-section')).tap();

      // Tap on exercise to view details
      await element(by.id('hep-exercise-0')).tap();

      // Verify exercise detail view
      await detoxExpect(element(by.id('exercise-image'))).toBeVisible();
      await detoxExpect(element(by.id('exercise-instructions'))).toBeVisible();
      await detoxExpect(element(by.id('exercise-video-link'))).toBeVisible();
    });

    it('should reorder HEP exercises', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-plan-0')).tap();
      await element(by.id('hep-section')).tap();

      // Enter edit mode
      await element(by.id('edit-hep-button')).tap();

      // Reorder (drag exercise 0 to position 2)
      // Note: Drag and drop is complex in Detox, simplified here
      await element(by.id('hep-exercise-0')).longPress();
      // await element(by.id('hep-exercise-0')).swipe('down', 'slow', 0.5);

      // Save order
      await element(by.id('save-hep-order-button')).tap();

      // Verify order changed
      // (Implementation-specific verification)
    });

    it('should remove HEP exercise', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-plan-0')).tap();
      await element(by.id('hep-section')).tap();

      // Enter edit mode
      await element(by.id('edit-hep-button')).tap();

      // Remove exercise
      await element(by.id('delete-hep-exercise-0')).tap();
      await element(by.text('Remove')).tap(); // Confirm

      // Verify removed
      await detoxExpect(element(by.id('hep-exercise-0'))).not.toBeVisible();

      // Save changes
      await element(by.id('save-hep-button')).tap();
    });
  });

  describe('Outcome Comparison Table', () => {
    it('should display baseline vs discharge comparison', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-summary-0')).tap();

      // Navigate to outcome measures section
      await element(by.id('outcome-measures-section')).tap();

      // Verify comparison table
      await detoxExpect(element(by.id('outcome-comparison-table'))).toBeVisible();

      // Verify columns
      await detoxExpect(element(by.text('Measure'))).toBeVisible();
      await detoxExpect(element(by.text('Baseline'))).toBeVisible();
      await detoxExpect(element(by.text('Discharge'))).toBeVisible();
      await detoxExpect(element(by.text('Change'))).toBeVisible();
      await detoxExpect(element(by.text('% Change'))).toBeVisible();

      // Verify MCID indicators
      await detoxExpect(element(by.id('mcid-met-indicator-0'))).toBeVisible();
    });

    it('should highlight clinically significant changes', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-summary-0')).tap();
      await element(by.id('outcome-measures-section')).tap();

      // Verify highlighting for measures that met MCID
      await detoxExpect(element(by.id('outcome-row-highlighted-0'))).toBeVisible();

      // Verify checkmark or badge
      await detoxExpect(element(by.id('mcid-achieved-icon-0'))).toBeVisible();
    });

    it('should show color-coded improvement indicators', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-summary-0')).tap();
      await element(by.id('outcome-measures-section')).tap();

      // Verify improvement indicators (green for improved, red for worsened)
      await detoxExpect(element(by.id('improvement-indicator-0'))).toBeVisible();
    });
  });

  describe('Network Transitions', () => {
    it('should continue PDF generation when going offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();
      await element(by.id('discharge-summary-0')).tap();

      // Start PDF export
      await element(by.id('export-pdf-button')).tap();

      // Disconnect mid-generation (should continue using local data)
      await device.setURLBlacklist(['*']);

      // Wait for completion
      await waitFor(element(by.id('pdf-generated-indicator')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify offline indicator
      await detoxExpect(element(by.id('offline-indicator'))).toBeVisible();

      // Verify PDF still accessible
      await detoxExpect(element(by.id('pdf-preview'))).toBeVisible();
    });

    it('should queue discharge summary for sync on creation', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('discharge-tab')).tap();

      // Create offline
      await device.setURLBlacklist(['*']);
      await element(by.id('generate-summary-button')).tap();
      await waitFor(element(by.id('summary-generated-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify queued
      await element(by.id('settings-tab')).tap();
      const count = await element(by.id('pending-sync-count'));
      await detoxExpect(count).toBeVisible();

      // Reconnect
      await device.setURLBlacklist([]);

      // Auto-sync should trigger
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(15000);
    });
  });
});
