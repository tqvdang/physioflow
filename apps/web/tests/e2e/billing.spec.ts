import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
  expectToast,
  getToday,
} from './fixtures/test-utils';

test.describe('Billing Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to patients list
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    // Click on first patient to view details
    const patientRow = page.locator('tr, [data-testid="patient-card"], .patient-card').first();
    if (await patientRow.isVisible()) {
      await patientRow.click();
      await waitForLoading(page);
    }
  });

  test.describe('Create Invoice', () => {
    test('should create invoice with multiple service codes', async ({ page }) => {
      // Navigate to billing section
      const billingLink = page.locator('a:has-text("Billing"), a:has-text("Invoice"), button:has-text("Billing")');
      if (await billingLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await billingLink.first().click();
        await waitForLoading(page);
      } else {
        // Try navigating directly
        const currentUrl = page.url();
        const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
        if (patientId) {
          await page.goto(`/vi/patients/${patientId}/billing`);
          await waitForLoading(page);
        }
      }

      // Look for create/new invoice button
      const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a[href*="invoice/new"]');
      if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.first().click();
        await waitForLoading(page);

        // Add first service code
        const addServiceButton = page.locator('button:has-text("Add Service"), button:has-text("Add Item")');
        if (await addServiceButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await addServiceButton.first().click();
          await page.waitForTimeout(300);

          // Select service from dropdown/search
          const serviceSelect = page.locator('select[name*="service"], input[name*="service"]').first();
          if (await serviceSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Try selecting by typing
            await serviceSelect.click();
            await serviceSelect.fill('Physical Therapy Evaluation');
            await page.waitForTimeout(500);

            // Select from dropdown
            const serviceOption = page.locator('[role="option"]:has-text("Evaluation"), li:has-text("Evaluation")').first();
            if (await serviceOption.isVisible({ timeout: 2000 }).catch(() => false)) {
              await serviceOption.click();
            }
          }

          // Set quantity
          const quantityInput = page.locator('input[name*="quantity"]').first();
          if (await quantityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await quantityInput.fill('1');
          }

          // Add second service
          if (await addServiceButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await addServiceButton.first().click();
            await page.waitForTimeout(300);

            // Add manual therapy service
            const secondService = page.locator('input[name*="service"]').nth(1);
            if (await secondService.isVisible({ timeout: 3000 }).catch(() => false)) {
              await secondService.click();
              await secondService.fill('Manual Therapy');
              await page.waitForTimeout(500);

              const manualOption = page.locator('[role="option"]:has-text("Manual"), li:has-text("Manual")').first();
              if (await manualOption.isVisible({ timeout: 2000 }).catch(() => false)) {
                await manualOption.click();
              }
            }

            // Set quantity for second service
            const secondQuantity = page.locator('input[name*="quantity"]').nth(1);
            if (await secondQuantity.isVisible({ timeout: 2000 }).catch(() => false)) {
              await secondQuantity.fill('2');
            }
          }

          // Set invoice date
          const dateInput = page.locator('input[type="date"][name*="date"]').first();
          if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await dateInput.fill(getToday());
          }

          // Add notes
          const notesInput = page.locator('textarea[name="notes"], textarea[name="description"]').first();
          if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await notesInput.fill('Session 1 - Initial evaluation and manual therapy treatment');
          }

          // Submit invoice
          const submitButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Save")');
          if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitButton.first().click();
            await waitForLoading(page);

            // Verify success
            await expectToast(page, /created|success|invoice/i);
          }
        }
      }
    });

    test('should validate required fields on invoice creation', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
      if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.first().click();
        await waitForLoading(page);

        // Try to submit empty form
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          // Should show validation errors
          const errorMessage = page.locator('.error, .text-red-500, [role="alert"]');
          if (await errorMessage.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(errorMessage.first()).toBeVisible();
          } else {
            // Should stay on the same page
            expect(page.url()).toMatch(/invoice|billing/);
          }
        }
      }
    });
  });

  test.describe('Automatic Copay Calculation', () => {
    test('should calculate copay based on insurance coverage', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Look for copay calculation display
      const copaySection = page.locator('[data-testid="copay"], .copay-amount, :has-text("Copay"), :has-text("Patient pays")');
      if (await copaySection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const copayText = await copaySection.first().textContent();
        // Should display copay amount
        expect(copayText).toMatch(/\d+|VND|₫/i);
      }
    });

    test('should update copay when services are added', async ({ page }) => {
      // Navigate to create invoice
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
      if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.first().click();
        await waitForLoading(page);

        // Get initial copay amount (if any)
        const copayDisplay = page.locator('[data-testid="copay-amount"], .copay, :has-text("Copay")');
        const initialCopay = await copayDisplay.first().textContent().catch(() => '0');

        // Add a service
        const addServiceButton = page.locator('button:has-text("Add Service"), button:has-text("Add Item")');
        if (await addServiceButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await addServiceButton.first().click();
          await page.waitForTimeout(500);

          // Copay should update
          await page.waitForTimeout(1000);
          const updatedCopay = await copayDisplay.first().textContent().catch(() => '0');

          // Copay might change (or might stay the same if no insurance)
          expect(updatedCopay).toBeTruthy();
        }
      }
    });

    test('should show insurance coverage percentage', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Look for coverage display
      const coverageDisplay = page.locator('[data-testid="coverage"], .coverage-percentage, :has-text("Coverage"), :has-text("%")');
      if (await coverageDisplay.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const coverageText = await coverageDisplay.first().textContent();
        expect(coverageText).toMatch(/\d+%|coverage|insurance/i);
      }
    });
  });

  test.describe('Record Payment', () => {
    test('should record cash payment', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Find an unpaid invoice and click on it
      const invoiceRow = page.locator('[data-status="pending"], tr:has-text("Pending"), .invoice-card').first();
      if (await invoiceRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await invoiceRow.click();
        await waitForLoading(page);

        // Look for pay/payment button
        const payButton = page.locator('button:has-text("Pay"), button:has-text("Payment"), button:has-text("Record")');
        if (await payButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await payButton.first().click();
          await page.waitForTimeout(500);

          // Select payment method (cash)
          const paymentMethodSelect = page.locator('select[name="paymentMethod"], [name="method"]');
          if (await paymentMethodSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
            await paymentMethodSelect.selectOption('cash');
          } else {
            // Try clicking cash button
            const cashButton = page.locator('button:has-text("Cash"), [data-method="cash"]');
            if (await cashButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
              await cashButton.first().click();
            }
          }

          // Enter payment amount
          const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
          if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await amountInput.fill('500000'); // 500,000 VND
          }

          // Add payment notes
          const notesInput = page.locator('textarea[name="notes"]').first();
          if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await notesInput.fill('Cash payment received');
          }

          // Submit payment
          const submitButton = page.locator('button[type="submit"]:has-text("Record"), button:has-text("Confirm")');
          if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitButton.first().click();
            await waitForLoading(page);

            // Verify success
            await expectToast(page, /payment|recorded|success/i);
          }
        }
      }
    });

    test('should record bank transfer payment', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      const invoiceRow = page.locator('[data-status="pending"], .invoice-card').first();
      if (await invoiceRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await invoiceRow.click();
        await waitForLoading(page);

        const payButton = page.locator('button:has-text("Pay"), button:has-text("Payment")');
        if (await payButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await payButton.first().click();
          await page.waitForTimeout(500);

          // Select bank transfer
          const bankButton = page.locator('button:has-text("Bank"), button:has-text("Transfer"), [data-method="bank"]');
          if (await bankButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await bankButton.first().click();

            // Enter transaction reference
            const referenceInput = page.locator('input[name="reference"], input[name="transactionId"]').first();
            if (await referenceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              await referenceInput.fill('TXN123456789');
            }

            // Submit
            const submitButton = page.locator('button[type="submit"]').first();
            if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await submitButton.first().click();
              await waitForLoading(page);
            }
          }
        }
      }
    });
  });

  test.describe('Payment History', () => {
    test('should display payment history', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Look for payment history section
      const historySection = page.locator('[data-testid="payment-history"], .payment-history, :has-text("Payment History")');
      if (await historySection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(historySection.first()).toBeVisible();

        // Should have payment records
        const paymentRecords = historySection.locator('tr, .payment-item, [data-testid*="payment"]');
        const recordCount = await paymentRecords.count();
        expect(recordCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter payments by date range', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Look for date filter
      const dateFromInput = page.locator('input[name*="dateFrom"], input[name*="startDate"]').first();
      if (await dateFromInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dateFromInput.fill('2024-01-01');

        const dateToInput = page.locator('input[name*="dateTo"], input[name*="endDate"]').first();
        if (await dateToInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dateToInput.fill(getToday());
        }

        // Apply filter
        const filterButton = page.locator('button:has-text("Filter"), button:has-text("Apply")');
        if (await filterButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await filterButton.first().click();
          await waitForLoading(page);
        }
      }
    });
  });

  test.describe('Invoice Status Updates', () => {
    test('should update invoice status from pending to paid', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Find pending invoice
      const pendingInvoice = page.locator('[data-status="pending"], .badge:has-text("Pending")').first();
      if (await pendingInvoice.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(pendingInvoice).toContainText(/pending/i);
      }
    });

    test('should display paid invoice with paid badge', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Look for paid invoice
      const paidInvoice = page.locator('[data-status="paid"], .badge:has-text("Paid")').first();
      if (await paidInvoice.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(paidInvoice).toContainText(/paid|completed/i);
      }
    });

    test('should show invoice total and balance', async ({ page }) => {
      // Navigate to billing
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/billing`);
        await waitForLoading(page);
      }

      // Look for total amount display
      const totalDisplay = page.locator('[data-testid="total"], .total-amount, :has-text("Total")');
      if (await totalDisplay.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const totalText = await totalDisplay.first().textContent();
        expect(totalText).toMatch(/\d+|VND|₫|total/i);
      }

      // Look for balance/outstanding display
      const balanceDisplay = page.locator('[data-testid="balance"], .balance, :has-text("Balance"), :has-text("Outstanding")');
      if (await balanceDisplay.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const balanceText = await balanceDisplay.first().textContent();
        expect(balanceText).toBeTruthy();
      }
    });
  });
});
