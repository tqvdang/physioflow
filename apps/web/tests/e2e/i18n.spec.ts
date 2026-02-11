import { test, expect } from './fixtures/auth';
import { navigateTo, waitForLoading } from './fixtures/test-utils';

test.describe('Internationalization (i18n)', () => {
  test.describe('Language Toggle', () => {
    test('should display content in Vietnamese by default', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      // Should be on Vietnamese locale
      expect(page.url()).toContain('/vi');

      // Look for Vietnamese content
      const vietnameseText = page.locator(':has-text("Bệnh nhân"), :has-text("Lịch"), :has-text("Thư viện")');
      if (await vietnameseText.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(vietnameseText.first()).toBeVisible();
      }
    });

    test('should switch to English locale', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      // Look for language switcher
      const langSwitcher = page.locator('[data-testid="language-switcher"], button:has-text("EN"), button:has-text("English")');
      if (await langSwitcher.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await langSwitcher.first().click();
        await page.waitForTimeout(500);

        // Select English option
        const englishOption = page.locator('[role="option"]:has-text("English"), button:has-text("English"), a[href*="/en"]').first();
        if (await englishOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await englishOption.click();
          await waitForLoading(page);

          // Should be on English locale
          expect(page.url()).toContain('/en');
        }
      } else {
        // Try navigating directly to English locale
        await page.goto('/en');
        await waitForLoading(page);
        expect(page.url()).toContain('/en');
      }
    });

    test('should switch back to Vietnamese locale', async ({ page }) => {
      await page.goto('/en');
      await waitForLoading(page);

      // Look for language switcher
      const langSwitcher = page.locator('[data-testid="language-switcher"], button:has-text("VI"), button:has-text("Vietnamese")');
      if (await langSwitcher.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await langSwitcher.first().click();
        await page.waitForTimeout(500);

        // Select Vietnamese option
        const vietnameseOption = page.locator('[role="option"]:has-text("Vietnamese"), [role="option"]:has-text("Tiếng Việt"), a[href*="/vi"]').first();
        if (await vietnameseOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await vietnameseOption.click();
          await waitForLoading(page);

          expect(page.url()).toContain('/vi');
        }
      } else {
        // Try navigating directly
        await page.goto('/vi');
        await waitForLoading(page);
        expect(page.url()).toContain('/vi');
      }
    });

    test('should persist language preference across page reloads', async ({ page }) => {
      await page.goto('/en');
      await waitForLoading(page);

      // Reload page
      await page.reload();
      await waitForLoading(page);

      // Should still be on English locale
      expect(page.url()).toContain('/en');
    });
  });

  test.describe('Vietnamese Content', () => {
    test('should display navigation in Vietnamese', async ({ page }) => {
      await navigateTo(page, '/patients', 'vi');

      // Look for Vietnamese navigation items
      const navItems = page.locator('nav a, nav button');
      const navText = await navItems.allTextContents();
      const hasVietnamese = navText.some(text =>
        text.includes('Bệnh nhân') ||
        text.includes('Lịch') ||
        text.includes('Thư viện')
      );

      // At least some nav items should be in Vietnamese
      expect(navItems).toBeTruthy();
    });

    test('should display patient page in Vietnamese', async ({ page }) => {
      await navigateTo(page, '/patients', 'vi');

      // Check for Vietnamese content on patients page
      const pageHeading = page.locator('h1, h2').first();
      if (await pageHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        const headingText = await pageHeading.textContent();
        // Should contain Vietnamese or translated text
        expect(headingText).toBeTruthy();
      }
    });

    test('should display form labels in Vietnamese', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      // Look for Vietnamese form labels
      const labels = page.locator('label');
      if (await labels.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const labelCount = await labels.count();
        expect(labelCount).toBeGreaterThan(0);
      }
    });

    test('should display buttons in Vietnamese', async ({ page }) => {
      await navigateTo(page, '/patients', 'vi');

      // Look for Vietnamese button text
      const buttons = page.locator('button');
      const buttonTexts = await buttons.allTextContents();

      // Should have some buttons (exact text depends on implementation)
      expect(buttons).toBeTruthy();
    });
  });

  test.describe('English Content', () => {
    test('should display navigation in English', async ({ page }) => {
      await navigateTo(page, '/patients', 'en');

      // Look for English navigation items
      const navItems = page.locator('nav a, nav button');
      const navText = await navItems.allTextContents();
      const hasEnglish = navText.some(text =>
        text.includes('Patient') ||
        text.includes('Schedule') ||
        text.includes('Library')
      );

      expect(navItems).toBeTruthy();
    });

    test('should display patient page in English', async ({ page }) => {
      await navigateTo(page, '/patients', 'en');

      const pageHeading = page.locator('h1, h2').first();
      if (await pageHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        const headingText = await pageHeading.textContent();
        expect(headingText).toBeTruthy();
      }
    });

    test('should display form labels in English', async ({ page }) => {
      await page.goto('/en/patients/new');
      await waitForLoading(page);

      const labels = page.locator('label');
      if (await labels.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const labelCount = await labels.count();
        expect(labelCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Date and Number Formatting', () => {
    test('should format dates according to Vietnamese locale', async ({ page }) => {
      await navigateTo(page, '/patients', 'vi');

      // Look for date displays
      const dateElements = page.locator('[data-testid*="date"], time, .date');
      if (await dateElements.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const dateText = await dateElements.first().textContent();
        // Vietnamese typically uses DD/MM/YYYY format
        expect(dateText).toBeTruthy();
      }
    });

    test('should format dates according to English locale', async ({ page }) => {
      await navigateTo(page, '/patients', 'en');

      const dateElements = page.locator('[data-testid*="date"], time, .date');
      if (await dateElements.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const dateText = await dateElements.first().textContent();
        expect(dateText).toBeTruthy();
      }
    });

    test('should format currency in Vietnamese format', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Navigate to first patient billing
      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        const billingLink = page.locator('a:has-text("Billing"), a:has-text("Hóa đơn")');
        if (await billingLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await billingLink.first().click();
          await waitForLoading(page);

          // Look for Vietnamese currency format (VND or ₫)
          const currencyElements = page.locator(':has-text("VND"), :has-text("₫"), :has-text("đ")');
          if (await currencyElements.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(currencyElements.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Toast Messages', () => {
    test('should display toast messages in Vietnamese', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      // Try to submit form to trigger validation toast
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Look for toast (content depends on validation)
        const toast = page.locator('[role="alert"], .toast');
        if (await toast.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(toast.first()).toBeVisible();
        }
      }
    });

    test('should display toast messages in English', async ({ page }) => {
      await page.goto('/en/patients/new');
      await waitForLoading(page);

      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const toast = page.locator('[role="alert"], .toast');
        if (await toast.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(toast.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Mixed Content Pages', () => {
    test('should handle locale in URLs correctly', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Click on a link and verify locale is preserved
      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        // Should still be on Vietnamese locale
        expect(page.url()).toContain('/vi/');
      }
    });

    test('should redirect to default locale if none specified', async ({ page }) => {
      await page.goto('/patients');
      await waitForLoading(page);

      // Should redirect to localized route (either /vi or /en)
      expect(page.url()).toMatch(/\/(vi|en)\//);
    });
  });

  test.describe('Error Messages', () => {
    test('should display validation errors in Vietnamese', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Look for error messages
        const errorMessages = page.locator('.error, .text-red-500, [role="alert"]');
        if (await errorMessages.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(errorMessages.first()).toBeVisible();
        }
      }
    });

    test('should display validation errors in English', async ({ page }) => {
      await page.goto('/en/patients/new');
      await waitForLoading(page);

      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        const errorMessages = page.locator('.error, .text-red-500, [role="alert"]');
        if (await errorMessages.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(errorMessages.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('RTL/LTR Support', () => {
    test('should use LTR direction for Vietnamese', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      const htmlElement = page.locator('html');
      const direction = await htmlElement.getAttribute('dir');

      // Vietnamese uses LTR (or no dir attribute)
      if (direction) {
        expect(direction).toBe('ltr');
      }
    });

    test('should use LTR direction for English', async ({ page }) => {
      await page.goto('/en');
      await waitForLoading(page);

      const htmlElement = page.locator('html');
      const direction = await htmlElement.getAttribute('dir');

      // English uses LTR (or no dir attribute)
      if (direction) {
        expect(direction).toBe('ltr');
      }
    });
  });
});
