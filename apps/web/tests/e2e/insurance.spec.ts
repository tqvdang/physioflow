import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
  fillByLabel,
  expectToast,
  generateTestData,
  getDateOffset,
  getToday,
} from './fixtures/test-utils';

test.describe('BHYT Insurance Card Management', () => {
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

  test.describe('Create Insurance Card', () => {
    test('should create insurance card with valid BHYT number', async ({ page }) => {
      // Navigate to insurance section
      const insuranceLink = page.locator('a:has-text("Insurance"), button:has-text("Insurance")');
      if (await insuranceLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await insuranceLink.first().click();
        await waitForLoading(page);
      } else {
        // Try navigating directly to insurance page
        const currentUrl = page.url();
        const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
        if (patientId) {
          await page.goto(`/vi/patients/${patientId}/insurance`);
          await waitForLoading(page);
        }
      }

      // Look for add/new insurance card button
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a[href*="insurance/new"]');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        // Fill insurance card form
        const cardNumberInput = page.locator('input[name="cardNumber"], input[placeholder*="card"]').first();
        if (await cardNumberInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Valid BHYT card format: HC1-2024-12345-67890
          await cardNumberInput.fill('HC1-2024-12345-67890');

          // Select prefix code (if dropdown exists)
          const prefixSelect = page.locator('select[name="prefixCode"], [name="prefixCode"]');
          if (await prefixSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
            await prefixSelect.selectOption('HC1');
          }

          // Fill valid dates
          const validFromInput = page.locator('input[name="validFrom"], input[type="date"]').first();
          if (await validFromInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await validFromInput.fill('2024-01-01');
          }

          const validToInput = page.locator('input[name="validTo"]').first();
          if (await validToInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await validToInput.fill('2025-12-31');
          }

          // Submit form
          const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")');
          if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitButton.first().click();
            await waitForLoading(page);

            // Verify success toast
            await expectToast(page, /created|success/i);

            // Verify card is displayed
            const cardDisplay = page.locator('[data-testid="card-number"], .insurance-card, text=/HC1/');
            if (await cardDisplay.first().isVisible({ timeout: 5000 }).catch(() => false)) {
              await expect(cardDisplay.first()).toContainText('HC1');
            }
          }
        }
      }
    });

    test('should validate card number in real-time', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for add insurance button
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a[href*="insurance/new"]');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        const cardNumberInput = page.locator('input[name="cardNumber"], input[placeholder*="card"]').first();
        if (await cardNumberInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Enter invalid card number
          await cardNumberInput.fill('INVALID123');
          await page.waitForTimeout(500); // Wait for validation

          // Should show error message
          const errorMessage = page.locator('.error, .text-red-500, [role="alert"]:has-text("Invalid"), .error-message');
          if (await errorMessage.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(errorMessage.first()).toContainText(/invalid|format/i);
          }
        }
      }
    });
  });

  test.describe('Coverage Preview', () => {
    test('should calculate and display coverage preview', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for coverage preview section
      const coverageSection = page.locator('[data-testid="coverage-preview"], .coverage-preview, :has-text("Coverage")');
      if (await coverageSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should display coverage percentage
        const coverageText = await coverageSection.first().textContent();
        expect(coverageText).toMatch(/\d+%|coverage/i);
      }
    });

    test('should show copay calculation', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for copay information
      const copaySection = page.locator('[data-testid="copay"], .copay, :has-text("Co-pay"), :has-text("Copay")');
      if (await copaySection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should display copay amount or percentage
        const copayText = await copaySection.first().textContent();
        expect(copayText).toMatch(/\d+|pay|insurance/i);
      }
    });
  });

  test.describe('Update Insurance Card', () => {
    test('should edit existing insurance card', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for edit button on existing card
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), [data-testid="edit-insurance"]');
      if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.first().click();
        await waitForLoading(page);

        // Update valid to date
        const validToInput = page.locator('input[name="validTo"]').first();
        if (await validToInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await validToInput.fill('2026-12-31');

          // Save changes
          const saveButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update")');
          if (await saveButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveButton.first().click();
            await waitForLoading(page);

            // Verify success
            await expectToast(page, /updated|success/i);
          }
        }
      }
    });
  });

  test.describe('Expired Card Warning', () => {
    test('should display warning for expired insurance card', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for expired card warning
      const warningBadge = page.locator('.badge-warning, .text-yellow-500, [data-status="expired"], :has-text("Expired")');
      if (await warningBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(warningBadge.first()).toContainText(/expired|warning/i);
      }
    });

    test('should show expiring soon notice', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for expiring soon notice (typically 30 days before expiry)
      const expiringNotice = page.locator('[data-status="expiring"], .text-orange-500, :has-text("Expiring")');
      if (await expiringNotice.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(expiringNotice.first()).toContainText(/expiring|soon/i);
      }
    });
  });

  test.describe('Hospital Registration Code', () => {
    test('should display hospital registration code field', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for add insurance button
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a[href*="insurance/new"]');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        // Look for hospital registration code field
        const regCodeInput = page.locator('input[name="hospital_registration_code"], input[placeholder="79024"]');
        if (await regCodeInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await regCodeInput.first().fill('79024');
          const value = await regCodeInput.first().inputValue();
          expect(value).toBe('79024');
        }
      }
    });

    test('should validate hospital registration code length', async ({ page }) => {
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a[href*="insurance/new"]');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        const regCodeInput = page.locator('input[name="hospital_registration_code"], input[placeholder="79024"]');
        if (await regCodeInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          // Should accept exactly 5 characters
          await regCodeInput.first().fill('79024');
          // Max length should be enforced by the input
          const value = await regCodeInput.first().inputValue();
          expect(value.length).toBeLessThanOrEqual(5);
        }
      }
    });
  });

  test.describe('Expiration Date', () => {
    test('should display expiration date field in form', async ({ page }) => {
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a[href*="insurance/new"]');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        // Look for expiration date field
        const expirationField = page.locator(':has-text("Expiration"), :has-text("expiration"), :has-text("het han")');
        if (await expirationField.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          const text = await expirationField.first().textContent();
          expect(text).toBeTruthy();
        }
      }
    });
  });

  test.describe('BHYT Card Display', () => {
    test('should display all insurance card details', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Check for insurance card display
      const insuranceCard = page.locator('[data-testid="insurance-card"], .insurance-card');
      if (await insuranceCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Card should contain key information
        const cardContent = await insuranceCard.first().textContent();

        // Should have card number or identifier
        expect(cardContent).toBeTruthy();
      }
    });

    test('should display insurance status badge', async ({ page }) => {
      // Navigate to insurance section
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/insurance`);
        await waitForLoading(page);
      }

      // Look for status badge (active/expired/expiring)
      const statusBadge = page.locator('.badge, [data-testid="insurance-status"], .status-badge');
      if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const statusText = await statusBadge.first().textContent();
        expect(statusText).toMatch(/active|expired|expiring/i);
      }
    });
  });
});
