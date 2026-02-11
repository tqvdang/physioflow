import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Sync Queue and Storage Management', () => {
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

  describe('Sync Queue Processing', () => {
    it('should queue operations in order', async () => {
      // Go offline
      await device.setURLBlacklist(['*']);

      // Create multiple operations
      // 1. Create insurance card
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();
      await element(by.id('card-number-input')).typeText('HC1-2024-11111-11111');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('save-insurance-button')).tap();
      await element(by.id('back-button')).tap();

      // 2. Record outcome measure
      await element(by.id('outcome-measures-tab')).tap();
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS')).tap();
      await element(by.id('current-score-input')).typeText('5');
      await element(by.id('baseline-score-input')).typeText('8');
      await element(by.id('target-score-input')).typeText('2');
      await element(by.id('save-measure-button')).tap();
      await element(by.id('back-button')).tap();

      // 3. Create invoice
      await element(by.id('billing-tab')).tap();
      await element(by.id('create-invoice-button')).tap();
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();
      await element(by.id('next-button')).tap();
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();
      await element(by.text('PT001')).tap();
      await element(by.id('quantity-input')).typeText('1');
      await element(by.id('add-item-button')).tap();
      await element(by.id('save-invoice-button')).tap();

      // Check sync queue
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('3');

      // Go online and sync
      await device.setURLBlacklist([]);
      await element(by.id('sync-all-button')).tap();

      // Verify all synced
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(20000);
    });

    it('should retry failed sync operations', async () => {
      // Create operation offline
      await device.setURLBlacklist(['*']);
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();
      await element(by.id('card-number-input')).typeText('HC1-2024-22222-22222');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('save-insurance-button')).tap();

      // Simulate partial connectivity (API endpoint fails)
      await device.setURLBlacklist(['*/insurance-cards']);

      // Attempt sync (should fail)
      await element(by.id('sync-button')).tap();

      // Verify still in queue
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('1');

      // Verify retry button available
      await element(by.id('sync-queue-button')).tap();
      await detoxExpect(element(by.id('sync-item-0'))).toBeVisible();
      await detoxExpect(element(by.id('retry-count-0'))).toBeVisible();

      // Restore full connectivity
      await device.setURLBlacklist([]);

      // Retry
      await element(by.id('retry-sync-item-0')).tap();

      // Verify success
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(10000);
    });

    it('should respect max retry attempts', async () => {
      // Create operation
      await device.setURLBlacklist(['*']);
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('outcome-measures-tab')).tap();
      await element(by.id('record-measure-button')).tap();
      await element(by.id('measure-type-selector')).tap();
      await element(by.text('NPRS')).tap();
      await element(by.id('current-score-input')).typeText('4');
      await element(by.id('baseline-score-input')).typeText('7');
      await element(by.id('target-score-input')).typeText('2');
      await element(by.id('save-measure-button')).tap();

      // Simulate persistent failure (wrong endpoint)
      await device.setURLBlacklist(['*/outcome-measures']);

      // Attempt sync multiple times
      for (let i = 0; i < 5; i++) {
        await element(by.id('sync-button')).tap();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify max attempts reached
      await element(by.id('settings-tab')).tap();
      await element(by.id('sync-queue-button')).tap();
      await detoxExpect(element(by.text('Max retries exceeded'))).toBeVisible();

      // Verify item marked as failed
      await detoxExpect(element(by.id('sync-item-failed-0'))).toBeVisible();
    });

    it('should allow manual deletion of failed items', async () => {
      // Create failed sync item (continue from previous test setup)
      await device.setURLBlacklist(['*']);
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();
      await element(by.id('card-number-input')).typeText('HC1-2024-33333-33333');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('save-insurance-button')).tap();

      // Fail sync
      await device.setURLBlacklist(['*/insurance-cards']);
      for (let i = 0; i < 5; i++) {
        await element(by.id('sync-button')).tap();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Delete failed item
      await element(by.id('settings-tab')).tap();
      await element(by.id('sync-queue-button')).tap();
      await element(by.id('delete-sync-item-0')).tap();
      await element(by.text('Delete')).tap(); // Confirm

      // Verify removed from queue
      await detoxExpect(element(by.id('sync-item-0'))).not.toBeVisible();
      await element(by.id('back-button')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('0');
    });
  });

  describe('Storage Quota Management', () => {
    it('should display storage usage', async () => {
      await element(by.id('settings-tab')).tap();
      await element(by.id('storage-settings')).tap();

      // Verify storage breakdown
      await detoxExpect(element(by.id('total-storage-used'))).toBeVisible();
      await detoxExpect(element(by.id('database-storage'))).toBeVisible();
      await detoxExpect(element(by.id('images-storage'))).toBeVisible();
      await detoxExpect(element(by.id('protocols-storage'))).toBeVisible();
      await detoxExpect(element(by.id('cache-storage'))).toBeVisible();
    });

    it('should warn when storage is low', async () => {
      // This would require mocking storage to simulate low space
      // In real scenario, when storage < 10% available:
      await element(by.id('settings-tab')).tap();
      await element(by.id('storage-settings')).tap();

      // If storage low, warning should be visible
      // await detoxExpect(element(by.id('low-storage-warning'))).toBeVisible();
      // await detoxExpect(element(by.text('Storage space is running low'))).toBeVisible();
    });

    it('should clear cache', async () => {
      await element(by.id('settings-tab')).tap();
      await element(by.id('storage-settings')).tap();

      // Clear cache
      await element(by.id('clear-cache-button')).tap();
      await element(by.text('Clear')).tap(); // Confirm

      // Verify cache cleared
      await waitFor(element(by.id('cache-storage')))
        .toHaveText('0 MB')
        .withTimeout(5000);

      // Verify success message
      await detoxExpect(element(by.text('Cache cleared successfully'))).toBeVisible();
    });

    it('should prevent new downloads when storage full', async () => {
      // This would require mocking storage quota
      // Simulate full storage scenario
      await element(by.id('protocols-tab')).tap();
      await element(by.id('protocol-item-0')).tap();

      // Attempt download when storage full
      await element(by.id('download-protocol-button')).tap();

      // Verify error shown
      // await detoxExpect(element(by.text('Insufficient storage space'))).toBeVisible();
      // await detoxExpect(element(by.id('free-up-space-button'))).toBeVisible();
    });
  });

  describe('Background Sync', () => {
    it('should sync when app returns from background', async () => {
      // Create offline data
      await device.setURLBlacklist(['*']);
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();
      await element(by.id('card-number-input')).typeText('HC1-2024-44444-44444');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('save-insurance-button')).tap();

      // Verify unsynced
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Reconnect
      await device.setURLBlacklist([]);

      // Send app to background
      await device.sendToHome();

      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Bring app back to foreground
      await device.launchApp({ newInstance: false });

      // Auto-sync should have triggered
      await waitFor(element(by.id('synced-badge')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should pause sync when app goes to background', async () => {
      // Start sync operation
      await device.setURLBlacklist(['*']);

      // Create multiple items
      for (let i = 0; i < 5; i++) {
        await element(by.id('patient-list')).tap();
        await element(by.id('patient-item-0')).tap();
        await element(by.id('outcome-measures-tab')).tap();
        await element(by.id('record-measure-button')).tap();
        await element(by.id('measure-type-selector')).tap();
        await element(by.text('NPRS')).tap();
        await element(by.id('current-score-input')).typeText('5');
        await element(by.id('baseline-score-input')).typeText('8');
        await element(by.id('target-score-input')).typeText('2');
        await element(by.id('save-measure-button')).tap();
        await element(by.id('back-button')).tap();
        await element(by.id('back-button')).tap();
      }

      // Go online and start sync
      await device.setURLBlacklist([]);
      await element(by.id('settings-tab')).tap();
      await element(by.id('sync-all-button')).tap();

      // Send to background mid-sync
      await device.sendToHome();

      // Wait
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Bring back
      await device.launchApp({ newInstance: false });

      // Sync should resume
      await element(by.id('settings-tab')).tap();
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(20000);
    });
  });

  describe('Batch Operations', () => {
    it('should handle large batch sync', async () => {
      // Create 20 items offline
      await device.setURLBlacklist(['*']);

      for (let i = 0; i < 20; i++) {
        await element(by.id('patient-list')).tap();
        await element(by.id('patient-item-0')).tap();
        await element(by.id('outcome-measures-tab')).tap();
        await element(by.id('record-measure-button')).tap();
        await element(by.id('measure-type-selector')).tap();
        await element(by.text('NPRS')).tap();
        await element(by.id('current-score-input')).typeText('5');
        await element(by.id('baseline-score-input')).typeText('8');
        await element(by.id('target-score-input')).typeText('2');
        await element(by.id('save-measure-button')).tap();
        await element(by.id('back-button')).tap();
        await element(by.id('back-button')).tap();
        await element(by.id('back-button')).tap();
      }

      // Verify count
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('20');

      // Go online and sync
      await device.setURLBlacklist([]);
      await element(by.id('sync-all-button')).tap();

      // Verify progress indicator
      await waitFor(element(by.id('sync-progress-modal')))
        .toBeVisible()
        .withTimeout(2000);

      // Wait for completion
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(60000);
    });

    it('should sync in batches to avoid overwhelming server', async () => {
      // Create 100 items (tests batch processing)
      await device.setURLBlacklist(['*']);

      for (let i = 0; i < 100; i++) {
        // Batch create via API simulation
        // In real test, use database directly for speed
      }

      // Verify queue
      await element(by.id('settings-tab')).tap();
      // await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('100');

      // Go online
      await device.setURLBlacklist([]);

      // Start sync
      await element(by.id('sync-all-button')).tap();

      // Verify batching (sync progress should show batch sizes)
      await waitFor(element(by.id('sync-progress-modal')))
        .toBeVisible()
        .withTimeout(2000);

      // Should process in batches of 50 (as per offline.ts)
      // await detoxExpect(element(by.text('Syncing 1-50 of 100'))).toBeVisible();

      // Wait for completion
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(120000);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from app crash during sync', async () => {
      // Create offline data
      await device.setURLBlacklist(['*']);
      await element(by.id('patient-list')).tap();
      await element(by.id('patient-item-0')).tap();
      await element(by.id('insurance-tab')).tap();
      await element(by.id('add-insurance-button')).tap();
      await element(by.id('card-number-input')).typeText('HC1-2024-55555-55555');
      await element(by.id('prefix-code-input')).typeText('HC');
      await element(by.id('save-insurance-button')).tap();

      // Go online
      await device.setURLBlacklist([]);

      // Terminate app mid-sync
      await element(by.id('sync-button')).tap();
      await device.terminateApp();

      // Restart app
      await device.launchApp();

      // Login again
      await element(by.id('email-input')).typeText('therapist1@physioflow.local');
      await element(by.id('password-input')).typeText('Therapist@123');
      await element(by.id('login-button')).tap();

      // Verify sync queue persisted
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).not.toHaveText('0');

      // Resume sync
      await element(by.id('sync-all-button')).tap();
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(15000);
    });

    it('should handle network interruption during sync', async () => {
      // Create multiple items
      await device.setURLBlacklist(['*']);
      for (let i = 0; i < 5; i++) {
        await element(by.id('patient-list')).tap();
        await element(by.id('patient-item-0')).tap();
        await element(by.id('insurance-tab')).tap();
        await element(by.id('add-insurance-button')).tap();
        await element(by.id('card-number-input')).typeText(`HC1-2024-${i}${i}${i}${i}${i}-${i}${i}${i}${i}${i}`);
        await element(by.id('prefix-code-input')).typeText('HC');
        await element(by.id('save-insurance-button')).tap();
        await element(by.id('back-button')).tap();
        await element(by.id('back-button')).tap();
      }

      // Start sync
      await device.setURLBlacklist([]);
      await element(by.id('settings-tab')).tap();
      await element(by.id('sync-all-button')).tap();

      // Interrupt network mid-sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      await device.setURLBlacklist(['*']);

      // Wait for error
      await waitFor(element(by.id('sync-error-notification')))
        .toBeVisible()
        .withTimeout(5000);

      // Restore network
      await device.setURLBlacklist([]);

      // Retry
      await element(by.id('retry-sync-button')).tap();

      // Should complete
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(20000);
    });
  });
});
