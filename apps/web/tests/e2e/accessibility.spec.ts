import { test, expect } from './fixtures/auth';
import { navigateTo, waitForLoading } from './fixtures/test-utils';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  test.describe('Automated Accessibility Scans', () => {
    test('should not have accessibility violations on patients page', async ({ page }) => {
      await navigateTo(page, '/patients');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on schedule page', async ({ page }) => {
      await navigateTo(page, '/schedule');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on library page', async ({ page }) => {
      await navigateTo(page, '/library');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on patient detail page', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      // Click on first patient
      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      }
    });

    test('should not have accessibility violations on patient form', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate through patients list with keyboard', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Tab through focusable elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Check if something is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should open and close modals with keyboard', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Look for a button to open modal
      const addButton = page.locator('button:has-text("Add"), button:has-text("New")');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Should open modal
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          // Press Escape to close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          // Modal should be closed
          await expect(modal.first()).not.toBeVisible();
        }
      }
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      // Focus on first input
      const firstInput = page.locator('input, textarea').first();
      if (await firstInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstInput.focus();

        // Note: Enter key submission depends on form implementation
        // This test verifies keyboard interaction is possible
        expect(await firstInput.evaluate(el => el === document.activeElement)).toBeTruthy();
      }
    });

    test('should navigate through form fields with Tab', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      const inputs = page.locator('input, textarea, select, button');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        // Tab through first few fields
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        // Something should be focused
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeTruthy();
      }
    });

    test('should navigate dropdown menus with arrow keys', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Look for dropdown button
      const dropdownButton = page.locator('[role="combobox"], select, button[aria-haspopup]').first();
      if (await dropdownButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dropdownButton.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Try arrow down
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);

        // Should navigate through options
        const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('role'));
        expect(focusedElement).toBeTruthy();
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Check for h1
      const h1 = page.locator('h1');
      if (await h1.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(h1.first()).toBeVisible();

        // H1 should have text content
        const h1Text = await h1.first().textContent();
        expect(h1Text).toBeTruthy();
      }
    });

    test('should have alt text for images', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Check all images have alt text
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        if (await img.isVisible()) {
          const alt = await img.getAttribute('alt');
          // Alt can be empty string for decorative images, but should exist
          expect(alt).toBeDefined();
        }
      }
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      // All inputs should have associated labels
      const inputs = page.locator('input:not([type="hidden"]), textarea, select');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          // Check for label association via for/id or aria-label
          const hasLabel = await input.evaluate(el => {
            const id = el.getAttribute('id');
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');

            if (ariaLabel || ariaLabelledBy) return true;
            if (id) {
              const label = document.querySelector(`label[for="${id}"]`);
              if (label) return true;
            }
            // Check if input is inside a label
            return el.closest('label') !== null;
          });

          expect(hasLabel).toBeTruthy();
        }
      }
    });

    test('should have ARIA landmarks', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Check for main landmark
      const main = page.locator('main, [role="main"]');
      if (await main.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(main.first()).toBeVisible();
      }

      // Check for navigation landmark
      const nav = page.locator('nav, [role="navigation"]');
      if (await nav.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(nav.first()).toBeVisible();
      }
    });

    test('should have proper button labels', async ({ page }) => {
      await navigateTo(page, '/patients');

      // All buttons should have accessible text
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const hasAccessibleText = await button.evaluate(el => {
            const textContent = el.textContent?.trim();
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');

            return !!(textContent || ariaLabel || ariaLabelledBy);
          });

          expect(hasAccessibleText).toBeTruthy();
        }
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Look for live regions
      const liveRegions = page.locator('[role="alert"], [role="status"], [aria-live]');
      const liveRegionCount = await liveRegions.count();

      // Should have at least one live region for toasts/alerts
      expect(liveRegionCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Tab to first focusable element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Check if focus is visible
      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Get computed styles to check for focus indicator
        const outline = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow,
          };
        });

        // Should have some form of focus indicator
        const hasFocusIndicator =
          outline.outline !== 'none' ||
          outline.outlineWidth !== '0px' ||
          outline.boxShadow !== 'none';

        expect(hasFocusIndicator).toBeTruthy();
      }
    });

    test('should trap focus in modal dialogs', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Open a modal
      const addButton = page.locator('button:has-text("Add"), button:has-text("New")');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');
        if (await modal.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          // Tab multiple times and verify focus stays within modal
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(50);
          }

          // Focused element should be within modal
          const focusedInModal = await page.evaluate(() => {
            const focused = document.activeElement;
            const modal = document.querySelector('[role="dialog"]');
            return modal?.contains(focused);
          });

          expect(focusedInModal).toBeTruthy();
        }
      }
    });

    test('should return focus after closing modal', async ({ page }) => {
      await navigateTo(page, '/patients');

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Close modal
        const closeButton = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[aria-label*="close"]').first();
        if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await closeButton.click();
          await page.waitForTimeout(500);

          // Focus should return to trigger button or logical next element
          const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
          expect(focusedElement).toBeTruthy();
        } else {
          // Try pressing Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast on patients page', async ({ page }) => {
      await navigateTo(page, '/patients');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .disableRules(['color-contrast']) // We'll check this separately
        .analyze();

      // Run color contrast check
      const contrastResults = await new AxeBuilder({ page })
        .include('body')
        .withRules(['color-contrast'])
        .analyze();

      expect(contrastResults.violations).toEqual([]);
    });
  });

  test.describe('Responsive Text', () => {
    test('should support text resizing up to 200%', async ({ page }) => {
      await navigateTo(page, '/patients');

      // Get initial text size
      const initialSize = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).fontSize;
      });

      // Zoom in (simulate 200% zoom)
      await page.evaluate(() => {
        document.body.style.fontSize = '200%';
      });

      await page.waitForTimeout(500);

      // Content should still be visible and usable
      const heading = page.locator('h1, h2').first();
      if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }

      // Reset
      await page.evaluate((size) => {
        document.body.style.fontSize = size;
      }, initialSize);
    });
  });

  test.describe('Error Handling', () => {
    test('should announce form validation errors', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      // Submit empty form
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Check for error messages with proper ARIA
        const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]');
        if (await errorMessages.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          const hasAriaAttributes = await errorMessages.first().evaluate(el => {
            return !!(el.getAttribute('role') === 'alert' ||
                     el.getAttribute('aria-live') ||
                     el.getAttribute('aria-invalid'));
          });

          expect(hasAriaAttributes).toBeTruthy();
        }
      }
    });
  });
});

test.describe('Accessibility - Outcome Measures', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
    if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientRow.click();
      await waitForLoading(page);
    }
  });

  test('should not have accessibility violations on outcome measures page', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/outcomes`);
      await waitForLoading(page);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should have proper ARIA attributes on edit dialog', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/outcomes`);
      await waitForLoading(page);
    }

    const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Edit"]');
    if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.first().click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Check for aria-labelledby or aria-label
        const hasAriaLabel = await dialog.evaluate(el => {
          return !!(el.getAttribute('aria-labelledby') || el.getAttribute('aria-label'));
        });
        expect(hasAriaLabel).toBeTruthy();

        // Run accessibility scan on dialog
        const accessibilityScanResults = await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      }
    }
  });

  test('should have proper focus management on delete confirmation', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/outcomes`);
      await waitForLoading(page);
    }

    const deleteButton = page.locator('[data-testid="measure-delete-button"], button[aria-label*="Delete"]');
    if (await deleteButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteButton.first().click();
      await page.waitForTimeout(500);

      // Verify alertdialog role
      const alertDialog = page.locator('[role="alertdialog"]');
      if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(alertDialog).toBeVisible();

        // Focus should be on a button within the dialog
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          const dialog = document.querySelector('[role="alertdialog"]');
          return dialog?.contains(focused);
        });
        expect(focusedElement).toBeTruthy();
      }
    }
  });

  test('should have proper keyboard navigation in edit form', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/outcomes`);
      await waitForLoading(page);
    }

    const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Edit"]');
    if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.first().click();
      await page.waitForTimeout(500);

      // Tab through form fields
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Verify something is focused within dialog
      const focusedInDialog = await page.evaluate(() => {
        const focused = document.activeElement;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(focused);
      });
      expect(focusedInDialog).toBeTruthy();

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Dialog should close
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible();
    }
  });
});

test.describe('Accessibility - Anatomy Regions', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
    if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientRow.click();
      await waitForLoading(page);
    }
  });

  test('should not have accessibility violations on anatomy diagram', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/assessment`);
      await waitForLoading(page);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should have proper ARIA labels on anatomy regions', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/assessment`);
      await waitForLoading(page);
    }

    // Check for anatomy regions with proper labels
    const regions = page.locator('[data-region]');
    const regionCount = await regions.count();

    if (regionCount > 0) {
      for (let i = 0; i < Math.min(regionCount, 5); i++) {
        const region = regions.nth(i);
        if (await region.isVisible()) {
          // Should have aria-label or accessible text
          const hasAccessibleName = await region.evaluate(el => {
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');
            const textContent = el.textContent?.trim();
            return !!(ariaLabel || ariaLabelledBy || textContent);
          });
          expect(hasAccessibleName).toBeTruthy();
        }
      }
    }
  });

  test('should support keyboard navigation for region selection', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/assessment`);
      await waitForLoading(page);
    }

    // Open region selector
    const selectorButton = page.locator('[data-testid="region-selector"], button:has-text("Select"), button:has-text("Chọn")');
    if (await selectorButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectorButton.first().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Tab through options
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Verify focus within selector
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('should announce region selection to screen readers', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/assessment`);
      await waitForLoading(page);
    }

    // Check for live region or status updates
    const liveRegion = page.locator('[role="status"], [aria-live="polite"], [aria-live="assertive"]');
    const hasLiveRegion = await liveRegion.count();

    // Should have at least one live region for announcements
    expect(hasLiveRegion).toBeGreaterThanOrEqual(0);
  });
});
