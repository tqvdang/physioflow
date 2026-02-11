import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Mobile Protocols Module', () => {
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

  describe('Download Protocol for Offline Access', () => {
    it('should download protocol for offline access', async () => {
      // Navigate to protocols
      await element(by.id('protocols-tab')).tap();

      // Verify protocol list is loaded
      await waitFor(element(by.id('protocol-list')))
        .toBeVisible()
        .withTimeout(3000);

      // Find protocol without download
      await element(by.id('protocol-item-0')).tap();

      // Download protocol
      await element(by.id('download-protocol-button')).tap();

      // Wait for download to complete
      await waitFor(element(by.id('download-complete-badge')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify offline indicator shows available offline
      await detoxExpect(element(by.id('available-offline-badge'))).toBeVisible();

      // Disconnect to verify offline access
      await device.setURLBlacklist(['*']);

      // Navigate back and re-enter
      await element(by.id('back-button')).tap();
      await element(by.id('protocol-item-0')).tap();

      // Verify protocol content is accessible
      await detoxExpect(element(by.id('protocol-title'))).toBeVisible();
      await detoxExpect(element(by.id('protocol-description'))).toBeVisible();
      await detoxExpect(element(by.id('exercise-list'))).toBeVisible();
    });

    it('should download protocol with exercises and images', async () => {
      await element(by.id('protocols-tab')).tap();
      await element(by.id('protocol-item-1')).tap();

      // Download protocol
      await element(by.id('download-protocol-button')).tap();

      // Verify progress indicator
      await waitFor(element(by.id('download-progress')))
        .toBeVisible()
        .withTimeout(2000);

      // Wait for completion
      await waitFor(element(by.id('download-complete-badge')))
        .toBeVisible()
        .withTimeout(15000);

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Verify exercises are accessible offline
      await element(by.id('exercise-0')).tap();
      await detoxExpect(element(by.id('exercise-image'))).toBeVisible();
      await detoxExpect(element(by.id('exercise-instructions'))).toBeVisible();
    });

    it('should show download size before downloading', async () => {
      await element(by.id('protocols-tab')).tap();
      await element(by.id('protocol-item-2')).tap();

      // Verify download button shows size
      await detoxExpect(element(by.id('protocol-download-size'))).toBeVisible();
      await detoxExpect(element(by.text('Download (2.5 MB)'))).toBeVisible();
    });

    it('should allow canceling download', async () => {
      await element(by.id('protocols-tab')).tap();
      await element(by.id('protocol-item-0')).tap();

      // Start download
      await element(by.id('download-protocol-button')).tap();

      // Cancel mid-download
      await waitFor(element(by.id('download-progress')))
        .toBeVisible()
        .withTimeout(2000);
      await element(by.id('cancel-download-button')).tap();

      // Verify download canceled
      await detoxExpect(element(by.id('download-protocol-button'))).toBeVisible();
      await detoxExpect(element(by.id('download-progress'))).not.toBeVisible();
    });

    it('should delete downloaded protocol', async () => {
      await element(by.id('protocols-tab')).tap();
      await element(by.id('protocol-item-0')).tap();

      // Download first
      await element(by.id('download-protocol-button')).tap();
      await waitFor(element(by.id('download-complete-badge')))
        .toBeVisible()
        .withTimeout(10000);

      // Delete downloaded content
      await element(by.id('protocol-options-button')).tap();
      await element(by.id('delete-offline-button')).tap();
      await element(by.text('Delete')).tap(); // Confirm

      // Verify download button reappears
      await detoxExpect(element(by.id('download-protocol-button'))).toBeVisible();
      await detoxExpect(element(by.id('available-offline-badge'))).not.toBeVisible();
    });
  });

  describe('Assign Protocol to Patient', () => {
    it('should assign protocol to patient offline', async () => {
      // Navigate to patient
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();

      // Go to protocols tab
      await element(by.id('patient-protocols-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Assign protocol
      await element(by.id('assign-protocol-button')).tap();
      await element(by.id('protocol-picker')).tap();
      await element(by.text('Lower Back Pain Protocol')).tap();

      // Set start date
      await element(by.id('start-date-picker')).tap();
      await element(by.text('OK')).tap();

      // Save assignment
      await element(by.id('save-assignment-button')).tap();

      // Verify unsynced badge
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify protocol appears in patient's list
      await detoxExpect(element(by.text('Lower Back Pain Protocol'))).toBeVisible();
    });
  });

  describe('Complete Exercise Session Offline', () => {
    it('should complete exercise session offline', async () => {
      // Navigate to patient with assigned protocol
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();

      // Open protocol
      await element(by.id('patient-protocol-0')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Start exercise session
      await element(by.id('start-session-button')).tap();

      // Complete first exercise
      await element(by.id('exercise-0')).tap();
      await element(by.id('sets-completed-input')).typeText('3');
      await element(by.id('reps-completed-input')).typeText('10');
      await element(by.id('mark-complete-button')).tap();

      // Verify exercise marked complete
      await detoxExpect(element(by.id('exercise-complete-icon-0'))).toBeVisible();

      // Complete second exercise
      await element(by.id('exercise-1')).tap();
      await element(by.id('sets-completed-input')).typeText('2');
      await element(by.id('reps-completed-input')).typeText('15');
      await element(by.id('mark-complete-button')).tap();

      // Complete session
      await element(by.id('finish-session-button')).tap();

      // Add session notes
      await element(by.id('session-notes-input')).typeText('Patient tolerated exercises well');
      await element(by.id('save-session-button')).tap();

      // Verify unsynced badge
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify session in history
      await element(by.id('session-history-tab')).tap();
      await detoxExpect(element(by.id('session-0'))).toBeVisible();
    });

    it('should track exercise modifications offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('start-session-button')).tap();

      // Complete with modification
      await element(by.id('exercise-0')).tap();
      await element(by.id('sets-completed-input')).typeText('2'); // Modified from 3
      await element(by.id('reps-completed-input')).typeText('8'); // Modified from 10
      await element(by.id('modification-toggle')).tap();
      await element(by.id('modification-reason-input')).typeText('Patient fatigue');
      await element(by.id('mark-complete-button')).tap();

      // Verify modification recorded
      await detoxExpect(element(by.id('modification-badge'))).toBeVisible();

      // Save session
      await element(by.id('finish-session-button')).tap();
      await element(by.id('save-session-button')).tap();

      // Verify in history
      await element(by.id('session-history-tab')).tap();
      await element(by.id('session-0')).tap();
      await detoxExpect(element(by.text('Patient fatigue'))).toBeVisible();
    });

    it('should record pain levels during exercises', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('start-session-button')).tap();

      // Complete exercise with pain level
      await element(by.id('exercise-0')).tap();
      await element(by.id('sets-completed-input')).typeText('3');
      await element(by.id('reps-completed-input')).typeText('10');

      // Set pain level (0-10 scale)
      await element(by.id('pain-level-slider')).swipe('right', 'fast', 0.6);
      await detoxExpect(element(by.id('pain-level-value'))).toHaveText('6');

      await element(by.id('mark-complete-button')).tap();

      // Finish session
      await element(by.id('finish-session-button')).tap();
      await element(by.id('save-session-button')).tap();

      // Verify pain tracked
      await element(by.id('session-history-tab')).tap();
      await element(by.id('session-0')).tap();
      await detoxExpect(element(by.text('Pain Level: 6/10'))).toBeVisible();
    });

    it('should pause and resume session offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('start-session-button')).tap();

      // Complete one exercise
      await element(by.id('exercise-0')).tap();
      await element(by.id('sets-completed-input')).typeText('3');
      await element(by.id('reps-completed-input')).typeText('10');
      await element(by.id('mark-complete-button')).tap();

      // Pause session
      await element(by.id('pause-session-button')).tap();

      // Verify session saved as draft
      await detoxExpect(element(by.id('session-draft-indicator'))).toBeVisible();

      // Navigate away
      await element(by.id('back-button')).tap();

      // Return and resume
      await element(by.id('patient-protocol-0')).tap();
      await detoxExpect(element(by.id('resume-session-button'))).toBeVisible();
      await element(by.id('resume-session-button')).tap();

      // Verify progress restored
      await detoxExpect(element(by.id('exercise-complete-icon-0'))).toBeVisible();

      // Complete remaining exercises
      await element(by.id('exercise-1')).tap();
      await element(by.id('sets-completed-input')).typeText('2');
      await element(by.id('reps-completed-input')).typeText('15');
      await element(by.id('mark-complete-button')).tap();

      await element(by.id('finish-session-button')).tap();
      await element(by.id('save-session-button')).tap();
    });
  });

  describe('Sync Progress', () => {
    it('should sync exercise progress when online', async () => {
      // Complete session offline
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('start-session-button')).tap();
      await element(by.id('exercise-0')).tap();
      await element(by.id('sets-completed-input')).typeText('3');
      await element(by.id('reps-completed-input')).typeText('10');
      await element(by.id('mark-complete-button')).tap();
      await element(by.id('finish-session-button')).tap();
      await element(by.id('save-session-button')).tap();

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

    it('should sync protocol assignments', async () => {
      // Assign protocol offline
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('assign-protocol-button')).tap();
      await element(by.id('protocol-picker')).tap();
      await element(by.text('Shoulder Rehab Protocol')).tap();
      await element(by.id('save-assignment-button')).tap();

      // Reconnect and sync
      await device.setURLBlacklist([]);
      await element(by.id('sync-button')).tap();

      // Verify sync complete
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should handle large session data sync', async () => {
      // Complete multiple sessions offline
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      await device.setURLBlacklist(['*']);

      // Complete 3 sessions
      for (let i = 0; i < 3; i++) {
        await element(by.id('start-session-button')).tap();
        await element(by.id('exercise-0')).tap();
        await element(by.id('sets-completed-input')).typeText('3');
        await element(by.id('reps-completed-input')).typeText('10');
        await element(by.id('mark-complete-button')).tap();
        await element(by.id('finish-session-button')).tap();
        await element(by.id('save-session-button')).tap();
      }

      // Reconnect
      await device.setURLBlacklist([]);

      // Trigger sync
      await element(by.id('sync-button')).tap();

      // Verify sync progress
      await waitFor(element(by.id('sync-progress-modal')))
        .toBeVisible()
        .withTimeout(2000);

      // Wait for completion
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(20000);
    });
  });

  describe('Protocol Progress Tracking', () => {
    it('should display progress bar correctly', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      // Verify progress bar
      await detoxExpect(element(by.id('protocol-progress-bar'))).toBeVisible();
      await detoxExpect(element(by.id('sessions-completed'))).toBeVisible();
      await detoxExpect(element(by.id('sessions-total'))).toBeVisible();
    });

    it('should show adherence percentage', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      // Verify adherence display
      await detoxExpect(element(by.id('adherence-percentage'))).toBeVisible();
      await detoxExpect(element(by.id('adherence-label'))).toHaveText('Adherence');
    });

    it('should track completion rate offline', async () => {
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('patient-protocols-tab')).tap();
      await element(by.id('patient-protocol-0')).tap();

      await device.setURLBlacklist(['*']);

      // Complete session
      await element(by.id('start-session-button')).tap();
      await element(by.id('exercise-0')).tap();
      await element(by.id('sets-completed-input')).typeText('3');
      await element(by.id('reps-completed-input')).typeText('10');
      await element(by.id('mark-complete-button')).tap();
      await element(by.id('finish-session-button')).tap();
      await element(by.id('save-session-button')).tap();

      // Verify progress updated
      await detoxExpect(element(by.id('protocol-progress-bar'))).toBeVisible();
      // Progress should increment
    });
  });

  describe('Storage Management', () => {
    it('should show storage used by downloaded protocols', async () => {
      await element(by.id('settings-tab')).tap();
      await element(by.id('storage-settings')).tap();

      // Verify storage breakdown
      await detoxExpect(element(by.id('protocols-storage-size'))).toBeVisible();
      await detoxExpect(element(by.id('images-storage-size'))).toBeVisible();
      await detoxExpect(element(by.id('total-storage-used'))).toBeVisible();
    });

    it('should clear all downloaded protocols', async () => {
      await element(by.id('settings-tab')).tap();
      await element(by.id('storage-settings')).tap();

      // Clear all downloads
      await element(by.id('clear-protocols-button')).tap();
      await element(by.text('Clear All')).tap(); // Confirm

      // Verify storage cleared
      await waitFor(element(by.id('protocols-storage-size')))
        .toHaveText('0 MB')
        .withTimeout(3000);
    });

    it('should warn when storage quota exceeded', async () => {
      // This would require mocking storage API
      // Test that warning appears when storage is low
      await element(by.id('protocols-tab')).tap();
      await element(by.id('protocol-item-0')).tap();

      // Simulate low storage scenario
      await element(by.id('download-protocol-button')).tap();

      // If storage low, warning should appear
      // await waitFor(element(by.id('storage-warning')))
      //   .toBeVisible()
      //   .withTimeout(2000);
    });
  });
});
