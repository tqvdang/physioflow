import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Mobile Billing Module', () => {
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

  describe('Create Invoice Offline', () => {
    it('should create invoice offline', async () => {
      // Navigate to billing
      await element(by.id('billing-tab')).tap();

      // Disconnect from network
      await device.setURLBlacklist(['*']);

      // Create new invoice
      await element(by.id('create-invoice-button')).tap();

      // Select patient
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();

      // Verify invoice date is today
      await detoxExpect(element(by.id('invoice-date'))).toBeVisible();

      // Proceed to add services
      await element(by.id('next-button')).tap();

      // Verify offline indicator
      await waitFor(element(by.id('offline-indicator')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should save invoice with multiple service items offline', async () => {
      await element(by.id('billing-tab')).tap();
      await device.setURLBlacklist(['*']);
      await element(by.id('create-invoice-button')).tap();

      // Select patient
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();
      await element(by.id('next-button')).tap();

      // Add first service
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();
      await element(by.text('PT001 - Tap luyen tri lieu')).tap();
      await element(by.id('quantity-input')).typeText('2');
      await element(by.id('unit-price-input')).typeText('250000');
      await element(by.id('add-item-button')).tap();

      // Add second service
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();
      await element(by.text('PT002 - Lieu phap thu cong')).tap();
      await element(by.id('quantity-input')).typeText('1');
      await element(by.id('unit-price-input')).typeText('300000');
      await element(by.id('add-item-button')).tap();

      // Verify total calculation
      await detoxExpect(element(by.id('subtotal'))).toHaveText('800,000 ₫');

      // Apply insurance (80% coverage)
      await element(by.id('apply-insurance-toggle')).tap();
      await detoxExpect(element(by.id('insurance-amount'))).toHaveText('640,000 ₫');
      await detoxExpect(element(by.id('copay-amount'))).toHaveText('160,000 ₫');

      // Save invoice
      await element(by.id('save-invoice-button')).tap();

      // Verify unsynced badge
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify invoice appears in list
      await element(by.id('billing-tab')).tap();
      await detoxExpect(element(by.id('invoice-pending-0'))).toBeVisible();
    });
  });

  describe('Service Code Picker', () => {
    it('should select service codes from picker', async () => {
      await element(by.id('billing-tab')).tap();
      await element(by.id('create-invoice-button')).tap();
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();
      await element(by.id('next-button')).tap();

      // Open service code picker
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();

      // Verify picker shows service list
      await detoxExpect(element(by.id('service-picker-modal'))).toBeVisible();
      await detoxExpect(element(by.text('PT001'))).toBeVisible();
      await detoxExpect(element(by.text('PT002'))).toBeVisible();
      await detoxExpect(element(by.text('PT003'))).toBeVisible();

      // Select service
      await element(by.text('PT001 - Tap luyen tri lieu')).tap();

      // Verify service selected and price auto-filled
      await detoxExpect(element(by.id('selected-service-code'))).toHaveText('PT001');
      await detoxExpect(element(by.id('unit-price-input'))).toHaveText('250000');
    });

    it('should search service codes', async () => {
      await element(by.id('billing-tab')).tap();
      await element(by.id('create-invoice-button')).tap();
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();
      await element(by.id('next-button')).tap();
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();

      // Search for specific service
      await element(by.id('service-search-input')).typeText('thu cong');

      // Verify filtered results
      await detoxExpect(element(by.text('PT002 - Lieu phap thu cong'))).toBeVisible();
      await detoxExpect(element(by.text('PT001'))).not.toBeVisible();
    });

    it('should work offline with cached service codes', async () => {
      await element(by.id('billing-tab')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      await element(by.id('create-invoice-button')).tap();
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();
      await element(by.id('next-button')).tap();
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();

      // Verify cached services available offline
      await detoxExpect(element(by.id('service-picker-modal'))).toBeVisible();
      await detoxExpect(element(by.text('PT001'))).toBeVisible();

      // Verify offline indicator
      await detoxExpect(element(by.id('offline-indicator'))).toBeVisible();
    });
  });

  describe('Record Payment Offline', () => {
    it('should record payment offline', async () => {
      // Navigate to existing invoice
      await element(by.id('billing-tab')).tap();
      await element(by.id('invoice-pending-0')).tap();

      // Disconnect
      await device.setURLBlacklist(['*']);

      // Record payment
      await element(by.id('record-payment-button')).tap();

      // Fill payment form
      await element(by.id('amount-input')).typeText('50000');
      await element(by.id('payment-method-cash')).tap();
      await element(by.id('receipt-number-input')).typeText('BL-001');

      // Save payment
      await element(by.id('save-payment-button')).tap();

      // Verify unsynced badge
      await waitFor(element(by.id('unsynced-badge')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify payment appears in history
      await detoxExpect(element(by.text('50,000 ₫'))).toBeVisible();
      await detoxExpect(element(by.text('Tien mat'))).toBeVisible();

      // Verify balance updated
      await detoxExpect(element(by.id('balance-due'))).toHaveText('110,000 ₫');
    });

    it('should record multiple payments offline', async () => {
      await element(by.id('billing-tab')).tap();
      await element(by.id('invoice-pending-0')).tap();

      await device.setURLBlacklist(['*']);

      // First payment
      await element(by.id('record-payment-button')).tap();
      await element(by.id('amount-input')).typeText('50000');
      await element(by.id('payment-method-cash')).tap();
      await element(by.id('save-payment-button')).tap();

      // Second payment
      await element(by.id('record-payment-button')).tap();
      await element(by.id('amount-input')).typeText('60000');
      await element(by.id('payment-method-card')).tap();
      await element(by.id('save-payment-button')).tap();

      // Verify both payments in history
      await detoxExpect(element(by.text('50,000 ₫'))).toBeVisible();
      await detoxExpect(element(by.text('60,000 ₫'))).toBeVisible();

      // Verify total paid
      await detoxExpect(element(by.id('total-paid'))).toHaveText('110,000 ₫');

      // Verify balance
      await detoxExpect(element(by.id('balance-due'))).toHaveText('50,000 ₫');
    });

    it('should validate payment amount', async () => {
      await element(by.id('billing-tab')).tap();
      await element(by.id('invoice-pending-0')).tap();
      await element(by.id('record-payment-button')).tap();

      // Try to pay more than balance
      await element(by.id('amount-input')).typeText('200000');
      await element(by.id('payment-method-cash')).tap();
      await element(by.id('save-payment-button')).tap();

      // Verify warning
      await detoxExpect(element(by.text('Payment exceeds balance due'))).toBeVisible();

      // Verify confirmation option available
      await detoxExpect(element(by.id('confirm-overpayment-button'))).toBeVisible();
    });

    it('should update invoice status after full payment', async () => {
      await element(by.id('billing-tab')).tap();
      await element(by.id('invoice-pending-0')).tap();

      await device.setURLBlacklist(['*']);

      // Get balance due amount
      const balanceDue = 160000; // 160,000 VND from example

      // Record full payment
      await element(by.id('record-payment-button')).tap();
      await element(by.id('amount-input')).typeText(balanceDue.toString());
      await element(by.id('payment-method-cash')).tap();
      await element(by.id('save-payment-button')).tap();

      // Verify status changed to paid
      await waitFor(element(by.id('status-paid')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify balance is zero
      await detoxExpect(element(by.id('balance-due'))).toHaveText('0 ₫');

      // Verify record payment button hidden
      await detoxExpect(element(by.id('record-payment-button'))).not.toBeVisible();
    });
  });

  describe('Sync Payments', () => {
    it('should sync payments when online', async () => {
      // Create invoice and payment offline
      await element(by.id('billing-tab')).tap();
      await element(by.id('invoice-pending-0')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('record-payment-button')).tap();
      await element(by.id('amount-input')).typeText('80000');
      await element(by.id('payment-method-transfer')).tap();
      await element(by.id('save-payment-button')).tap();

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

    it('should sync invoices with items and payments', async () => {
      // Create complete invoice offline
      await element(by.id('billing-tab')).tap();
      await device.setURLBlacklist(['*']);
      await element(by.id('create-invoice-button')).tap();

      // Create invoice with services
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();
      await element(by.id('next-button')).tap();
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();
      await element(by.text('PT001')).tap();
      await element(by.id('quantity-input')).typeText('1');
      await element(by.id('add-item-button')).tap();
      await element(by.id('save-invoice-button')).tap();

      // Record payment
      await element(by.id('record-payment-button')).tap();
      await element(by.id('amount-input')).typeText('50000');
      await element(by.id('payment-method-cash')).tap();
      await element(by.id('save-payment-button')).tap();

      // Verify sync queue shows multiple items
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('pending-sync-count'))).toHaveText('3'); // invoice + item + payment

      // Reconnect and sync
      await device.setURLBlacklist([]);
      await element(by.id('sync-all-button')).tap();

      // Wait for all to sync
      await waitFor(element(by.id('pending-sync-count')))
        .toHaveText('0')
        .withTimeout(15000);
    });

    it('should handle payment sync conflicts', async () => {
      // Create payment offline
      await element(by.id('billing-tab')).tap();
      await element(by.id('invoice-pending-0')).tap();

      await device.setURLBlacklist(['*']);
      await element(by.id('record-payment-button')).tap();
      await element(by.id('amount-input')).typeText('100000');
      await element(by.id('payment-method-cash')).tap();
      await element(by.id('save-payment-button')).tap();

      // Simulate server-side payment
      await device.setURLBlacklist([]);

      // Trigger sync
      await element(by.id('sync-button')).tap();

      // If conflict occurs, modal should appear
      await waitFor(element(by.id('conflict-modal')))
        .toBeVisible()
        .withTimeout(5000);

      // Choose to keep both payments
      await element(by.id('keep-both-button')).tap();

      // Verify both payments in history
      await detoxExpect(element(by.id('payment-0'))).toBeVisible();
      await detoxExpect(element(by.id('payment-1'))).toBeVisible();
    });
  });

  describe('Billing List View', () => {
    it('should filter invoices by status', async () => {
      await element(by.id('billing-tab')).tap();

      // Verify all invoices shown by default
      await detoxExpect(element(by.id('invoice-pending-0'))).toBeVisible();
      await detoxExpect(element(by.id('invoice-paid-0'))).toBeVisible();

      // Filter by pending
      await element(by.id('filter-button')).tap();
      await element(by.id('filter-pending')).tap();
      await element(by.id('apply-filter-button')).tap();

      // Verify only pending shown
      await detoxExpect(element(by.id('invoice-pending-0'))).toBeVisible();
      await detoxExpect(element(by.id('invoice-paid-0'))).not.toBeVisible();
    });

    it('should search invoices by patient name', async () => {
      await element(by.id('billing-tab')).tap();

      // Search
      await element(by.id('search-input')).typeText('Nguyen Van A');

      // Verify filtered results
      await detoxExpect(element(by.text('Nguyen Van A'))).toBeVisible();
    });

    it('should display sync status in list', async () => {
      await element(by.id('billing-tab')).tap();

      // Verify synced invoices have checkmark
      await detoxExpect(element(by.id('invoice-synced-indicator-0'))).toBeVisible();

      // Create unsynced invoice
      await device.setURLBlacklist(['*']);
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

      // Verify unsynced indicator
      await element(by.id('billing-tab')).tap();
      await detoxExpect(element(by.id('invoice-unsynced-indicator-0'))).toBeVisible();
    });
  });

  describe('Currency Formatting', () => {
    it('should format VND currency correctly', async () => {
      await element(by.id('billing-tab')).tap();
      await element(by.id('invoice-pending-0')).tap();

      // Verify currency formatting
      await detoxExpect(element(by.text('800,000 ₫'))).toBeVisible();
      await detoxExpect(element(by.text('160,000 ₫'))).toBeVisible();
    });

    it('should handle large amounts', async () => {
      await element(by.id('billing-tab')).tap();
      await element(by.id('create-invoice-button')).tap();
      await element(by.id('patient-picker')).tap();
      await element(by.text('Nguyen Van A')).tap();
      await element(by.id('next-button')).tap();

      // Add expensive service
      await element(by.id('add-service-button')).tap();
      await element(by.id('service-code-picker')).tap();
      await element(by.text('PT001')).tap();
      await element(by.id('quantity-input')).typeText('20');
      await element(by.id('unit-price-input')).clearText();
      await element(by.id('unit-price-input')).typeText('1500000');
      await element(by.id('add-item-button')).tap();

      // Verify large amount formatting
      await detoxExpect(element(by.text('30,000,000 ₫'))).toBeVisible();
    });
  });
});
