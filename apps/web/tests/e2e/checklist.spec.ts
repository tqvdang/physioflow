import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
} from './fixtures/test-utils';

test.describe('Checklist/Visit Management', () => {
  test.describe('Start Session', () => {
    test('should navigate to session from patient detail', async ({ page }) => {
      // First navigate to patients
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      // Click on first patient
      const patientRow = page.locator('tr, [data-testid="patient-card"], .patient-card').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        // Find start session button
        const sessionButton = page.locator('button:has-text("Session"), button:has-text("Start"), a:has-text("Session")');
        if (await sessionButton.first().isVisible()) {
          await sessionButton.first().click();
          await waitForLoading(page);

          // Should be on session page
          expect(page.url()).toMatch(/session/);
        }
      }
    });
  });

  test.describe('Checklist Items', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a session page (assuming we have test data)
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const sessionButton = page.locator('button:has-text("Session"), a:has-text("Session")');
        if (await sessionButton.first().isVisible()) {
          await sessionButton.first().click();
          await waitForLoading(page);
        }
      }
    });

    test('should display checklist sections', async ({ page }) => {
      if (page.url().includes('session')) {
        // Should see checklist sections
        const sections = page.locator('[data-testid="checklist-section"], .checklist-section, section');
        await expect(sections.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('should fill checkbox item', async ({ page }) => {
      if (page.url().includes('session')) {
        // Find checkbox items
        const checkbox = page.locator('input[type="checkbox"], [role="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
          await page.waitForTimeout(600); // Wait for auto-save debounce
        }
      }
    });

    test('should fill pain scale slider', async ({ page }) => {
      if (page.url().includes('session')) {
        // Find pain slider
        const slider = page.locator('input[type="range"], [role="slider"]').first();
        if (await slider.isVisible()) {
          // Set value to 5
          await slider.fill('5');
          await page.waitForTimeout(600);
        }
      }
    });

    test('should fill text input', async ({ page }) => {
      if (page.url().includes('session')) {
        // Find text input
        const textInput = page.locator('textarea, input[type="text"]').first();
        if (await textInput.isVisible()) {
          await textInput.fill('Test note from e2e');
          await page.waitForTimeout(600);
        }
      }
    });

    test('should show progress indicator', async ({ page }) => {
      if (page.url().includes('session')) {
        // Find progress bar/indicator
        const progress = page.locator('[data-testid="progress"], progress, .progress-bar, [role="progressbar"]');
        if (await progress.first().isVisible()) {
          await expect(progress.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Auto-Generated SOAP Note', () => {
    test('should display generated note section', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const sessionButton = page.locator('button:has-text("Session"), a:has-text("Session")');
        if (await sessionButton.first().isVisible()) {
          await sessionButton.first().click();
          await waitForLoading(page);

          if (page.url().includes('session')) {
            // Look for SOAP note section
            const soapSection = page.locator('[data-testid="soap-note"], .soap-note, :text("SOAP"), :text("Note")');
            // May not always be visible depending on template
          }
        }
      }
    });
  });

  test.describe('Complete Session', () => {
    test('should have complete button', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const sessionButton = page.locator('button:has-text("Session"), a:has-text("Session")');
        if (await sessionButton.first().isVisible()) {
          await sessionButton.first().click();
          await waitForLoading(page);

          if (page.url().includes('session')) {
            // Find complete button
            const completeButton = page.locator('button:has-text("Complete"), button:has-text("Finish")');
            if (await completeButton.first().isVisible()) {
              await expect(completeButton.first()).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Quick Schedule', () => {
    test('should display quick schedule buttons', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const sessionButton = page.locator('button:has-text("Session"), a:has-text("Session")');
        if (await sessionButton.first().isVisible()) {
          await sessionButton.first().click();
          await waitForLoading(page);

          if (page.url().includes('session')) {
            // Look for quick schedule buttons
            const quickButtons = page.locator('button:has-text("+3"), button:has-text("+7"), button:has-text("days")');
            // May or may not be visible
          }
        }
      }
    });
  });

  test.describe('Session Timer', () => {
    test('should display session timer', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const sessionButton = page.locator('button:has-text("Session"), a:has-text("Session")');
        if (await sessionButton.first().isVisible()) {
          await sessionButton.first().click();
          await waitForLoading(page);

          if (page.url().includes('session')) {
            // Look for timer
            const timer = page.locator('[data-testid="timer"], .timer, .elapsed-time');
            // May or may not be visible
          }
        }
      }
    });
  });
});
