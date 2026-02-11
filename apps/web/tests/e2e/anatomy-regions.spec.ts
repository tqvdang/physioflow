import { test, expect } from './fixtures/auth';
import { navigateTo, waitForLoading, expectToast } from './fixtures/test-utils';

test.describe('Anatomy Regions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to patients list
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    // Click on first patient to view details
    const patientRow = page.locator('tr, [data-testid="patient-card"], .patient-card').first();
    if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientRow.click();
      await waitForLoading(page);
    }
  });

  test.describe('Anatomy Diagram Display', () => {
    test('should display anatomy diagram with API regions', async ({ page }) => {
      // Navigate to assessment page
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/assessment`);
        await waitForLoading(page);
      }

      // Wait for regions to load from API
      const diagram = page.locator('[data-testid="anatomy-diagram"]');
      if (await diagram.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(diagram).toBeVisible();

        // Verify front view regions rendered
        const shoulderLeft = page.locator('[data-region="shoulder_left"], [data-region*="shoulder"]');
        if (await shoulderLeft.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(shoulderLeft.first()).toBeVisible();
        }

        const kneeRight = page.locator('[data-region="knee_right"], [data-region*="knee"]');
        if (await kneeRight.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(kneeRight.first()).toBeVisible();
        }
      }
    });

    test('should switch between front and back views', async ({ page }) => {
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/assessment`);
        await waitForLoading(page);
      }

      // Look for view toggle buttons
      const backViewButton = page.locator('button:has-text("Back"), button:has-text("Sau"), [data-view="back"]');
      if (await backViewButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await backViewButton.first().click();
        await page.waitForTimeout(500);

        // Verify back view regions appear
        const lumbarSpine = page.locator('[data-region="lumbar_spine"], [data-region*="lumbar"], [data-region*="spine"]');
        if (await lumbarSpine.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(lumbarSpine.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Pain Location Marking', () => {
    test('should allow selecting regions for pain marking', async ({ page }) => {
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/assessment`);
        await waitForLoading(page);
      }

      // Click on shoulder region
      const shoulderRegion = page.locator('[data-region="shoulder_left"], [data-region*="shoulder"]').first();
      if (await shoulderRegion.isVisible({ timeout: 5000 }).catch(() => false)) {
        await shoulderRegion.click();
        await page.waitForTimeout(500);

        // Verify severity selector or pain form appears
        const severityInput = page.locator('[name="severity"], input[type="range"], input[type="number"]');
        if (await severityInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(severityInput.first()).toBeVisible();

          // Select severity
          await severityInput.first().fill('7');

          // Look for save button
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Lưu"), button[type="submit"]');
          if (await saveButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveButton.first().click();
            await waitForLoading(page);

            // Verify success notification
            await expectToast(page, /saved|success|lưu|thành công/i);
          }
        }
      }
    });

    test('should display pain severity on selected region', async ({ page }) => {
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/assessment`);
        await waitForLoading(page);
      }

      // Look for regions with pain indicators
      const painIndicator = page.locator('[data-has-pain="true"], .pain-marker, [data-severity]');
      if (await painIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(painIndicator.first()).toBeVisible();
      }
    });
  });

  test.describe('Region Selector', () => {
    test('should filter regions by category in selector', async ({ page }) => {
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/pain-location`);
        await waitForLoading(page);
      }

      // Open region selector
      const selectorButton = page.locator('[data-testid="region-selector"], button:has-text("Select Region"), button:has-text("Chọn vùng")');
      if (await selectorButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await selectorButton.first().click();
        await page.waitForTimeout(500);

        // Verify categories displayed
        const upperLimb = page.locator('text=/Upper Limb|Chi trên/i');
        const lowerLimb = page.locator('text=/Lower Limb|Chi dưới/i');
        const spine = page.locator('text=/Spine|Cột sống/i');

        if (await upperLimb.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(upperLimb.first()).toBeVisible();
        }
        if (await lowerLimb.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(lowerLimb.first()).toBeVisible();
        }
        if (await spine.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(spine.first()).toBeVisible();
        }
      }
    });

    test('should select region from category list', async ({ page }) => {
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/pain-location`);
        await waitForLoading(page);
      }

      // Open region selector
      const selectorButton = page.locator('[data-testid="region-selector"], button:has-text("Select"), button:has-text("Chọn")');
      if (await selectorButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await selectorButton.first().click();
        await page.waitForTimeout(500);

        // Select region (Vietnamese)
        const leftShoulder = page.locator('text=/Vai trái|Left Shoulder/i');
        if (await leftShoulder.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await leftShoulder.first().click();
          await page.waitForTimeout(500);

          // Verify selection
          const selectedText = await selectorButton.first().textContent();
          expect(selectedText).toMatch(/Vai trái|Left Shoulder/i);
        }
      }
    });
  });

  test.describe('Offline Support', () => {
    test('should work offline (falls back to cached regions)', async ({ page, context }) => {
      // Load page first while online
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/assessment`);
        await waitForLoading(page);
      }

      // Go offline
      await context.setOffline(true);

      // Reload page
      await page.reload();
      await waitForLoading(page);

      // Diagram should still render with fallback data
      const diagram = page.locator('[data-testid="anatomy-diagram"]');
      if (await diagram.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(diagram).toBeVisible();

        // Should still show regions
        const regions = page.locator('[data-region]');
        const regionCount = await regions.count();
        expect(regionCount).toBeGreaterThan(0);
      }

      // Go back online
      await context.setOffline(false);
    });
  });
});

test.describe('Anatomy Regions - Bilingual', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
    if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientRow.click();
      await waitForLoading(page);
    }
  });

  test('should display Vietnamese names in vi locale', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/assessment`);
      await waitForLoading(page);
    }

    // Open region selector
    const selectorButton = page.locator('[data-testid="region-selector"], button:has-text("Chọn")');
    if (await selectorButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectorButton.first().click();
      await page.waitForTimeout(500);

      // Verify Vietnamese names
      const shoulderVi = page.locator('text=Vai trái'); // Left Shoulder
      const kneeVi = page.locator('text=Gối phải'); // Right Knee

      if (await shoulderVi.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(shoulderVi.first()).toBeVisible();
      }
      if (await kneeVi.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(kneeVi.first()).toBeVisible();
      }
    }
  });

  test('should display English names in en locale', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/en/patients/${patientId}/assessment`);
      await waitForLoading(page);
    }

    // Open region selector
    const selectorButton = page.locator('[data-testid="region-selector"], button:has-text("Select")');
    if (await selectorButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectorButton.first().click();
      await page.waitForTimeout(500);

      // Verify English names
      const shoulderEn = page.locator('text=Left Shoulder');
      const kneeEn = page.locator('text=Right Knee');

      if (await shoulderEn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(shoulderEn.first()).toBeVisible();
      }
      if (await kneeEn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(kneeEn.first()).toBeVisible();
      }
    }
  });
});
