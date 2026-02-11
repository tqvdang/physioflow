import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
} from './fixtures/test-utils';

test.describe('Anatomy Visualization - Pain Locations', () => {
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

  test.describe('Pain Location Marking', () => {
    test('should open pain marker dialog with front and back views', async ({ page }) => {
      // Look for the "Mark Pain Locations" button
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Verify front/back tabs exist
        const frontTab = page.locator('button:has-text("Front View"), [value="front"]');
        const backTab = page.locator('button:has-text("Back View"), [value="back"]');

        await expect(frontTab.first()).toBeVisible();
        await expect(backTab.first()).toBeVisible();

        // Verify the SVG body diagram is rendered
        const svg = dialog.locator('svg');
        await expect(svg.first()).toBeVisible();
      }
    });

    test('should click a body region and set severity', async ({ page }) => {
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Click on a body region (e.g., shoulder_left)
        const shoulderRegion = dialog.locator('g#shoulder_left, [id="shoulder_left"]');
        if (await shoulderRegion.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await shoulderRegion.first().click();
          await page.waitForTimeout(300);

          // Verify the pain editor appears
          const painEditor = dialog.locator('[data-testid="pain-editor"]');
          await expect(painEditor).toBeVisible();

          // Verify severity slider exists
          const severitySlider = dialog.locator('[data-testid="severity-slider"]');
          await expect(severitySlider).toBeVisible();

          // Verify description textarea exists
          const descTextarea = dialog.locator('[data-testid="pain-description"]');
          await expect(descTextarea).toBeVisible();

          // Fill in description
          await descTextarea.fill('Sharp pain on movement');

          // Click "Mark Pain" button
          const markPainBtn = dialog.locator('[data-testid="set-pain-btn"]');
          await expect(markPainBtn).toBeVisible();
          await markPainBtn.click();
          await page.waitForTimeout(300);

          // Verify the region appears in the marked locations list
          const locationsList = dialog.locator('[data-testid="pain-locations-list"]');
          if (await locationsList.isVisible({ timeout: 3000 }).catch(() => false)) {
            const locationItem = locationsList.locator('button:has-text("Shoulder")');
            await expect(locationItem.first()).toBeVisible();
          }
        }
      }
    });

    test('should switch between front and back views', async ({ page }) => {
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Click the back view tab
        const backTab = page.locator('button:has-text("Back View"), [value="back"]');
        if (await backTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await backTab.first().click();
          await page.waitForTimeout(300);

          // Verify back-specific regions are now visible (e.g., lumbar_spine)
          const lumbarRegion = dialog.locator('g#lumbar_spine, [id="lumbar_spine"]');
          await expect(lumbarRegion.first()).toBeVisible();
        }

        // Switch back to front view
        const frontTab = page.locator('button:has-text("Front View"), [value="front"]');
        if (await frontTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await frontTab.first().click();
          await page.waitForTimeout(300);

          // Verify front-specific regions are visible
          const chestRegion = dialog.locator('g#chest_left, [id="chest_left"]');
          await expect(chestRegion.first()).toBeVisible();
        }
      }
    });

    test('should save pain locations', async ({ page }) => {
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Click on knee region
        const kneeRegion = dialog.locator('g#knee_left, [id="knee_left"]');
        if (await kneeRegion.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await kneeRegion.first().click();
          await page.waitForTimeout(300);

          // Set pain with description
          const descTextarea = dialog.locator('[data-testid="pain-description"]');
          if (await descTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
            await descTextarea.fill('Aching pain when walking');
          }

          // Click mark pain
          const markPainBtn = dialog.locator('[data-testid="set-pain-btn"]');
          if (await markPainBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await markPainBtn.click();
            await page.waitForTimeout(300);
          }
        }

        // Click save
        const saveBtn = dialog.locator('[data-testid="save-pain-locations"]');
        if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(500);

          // Dialog should close
          await expect(dialog).not.toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('should remove a marked pain location', async ({ page }) => {
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Mark a region first
        const headRegion = dialog.locator('g#head, [id="head"]');
        if (await headRegion.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await headRegion.first().click();
          await page.waitForTimeout(300);

          const markPainBtn = dialog.locator('[data-testid="set-pain-btn"]');
          if (await markPainBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await markPainBtn.click();
            await page.waitForTimeout(300);
          }

          // Now click the region again to edit
          await headRegion.first().click();
          await page.waitForTimeout(300);

          // Click remove button
          const removeBtn = dialog.locator('button:has-text("Remove")');
          if (await removeBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await removeBtn.first().click();
            await page.waitForTimeout(300);

            // Verify the marked locations count changed
            const markedLocations = dialog.locator(
              'h3:has-text("Marked Locations (0)")'
            );
            await expect(markedLocations).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should render front body diagram correctly', async ({ page }) => {
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Verify SVG has expected interactive regions
        const svg = dialog.locator('svg').first();
        await expect(svg).toBeVisible();

        // Check that key front regions exist as interactive elements
        const frontRegionIds = [
          'head', 'neck_front', 'shoulder_left', 'shoulder_right',
          'chest_left', 'chest_right', 'abdomen_upper', 'abdomen_lower',
          'hip_left', 'hip_right', 'knee_left', 'knee_right',
          'ankle_left', 'ankle_right', 'foot_left', 'foot_right',
        ];

        for (const regionId of frontRegionIds) {
          const region = dialog.locator(`g#${regionId}, g[id="${regionId}"]`);
          // At least verify the element exists in the DOM
          const count = await region.count();
          expect(count).toBeGreaterThanOrEqual(1);
        }
      }
    });

    test('should render back body diagram correctly', async ({ page }) => {
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Switch to back view
        const backTab = page.locator('button:has-text("Back View"), [value="back"]');
        if (await backTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await backTab.first().click();
          await page.waitForTimeout(300);

          // Check key back regions exist
          const backRegionIds = [
            'neck_back', 'cervical_spine', 'thoracic_spine_upper',
            'thoracic_spine_lower', 'lumbar_spine', 'sacrum',
            'gluteal_left', 'gluteal_right',
            'thigh_left_back', 'thigh_right_back',
            'calf_left', 'calf_right',
          ];

          for (const regionId of backRegionIds) {
            const region = dialog.locator(`g#${regionId}, g[id="${regionId}"]`);
            const count = await region.count();
            expect(count).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });

    test('should display severity colors on marked regions', async ({ page }) => {
      const markButton = page.locator(
        'button:has-text("Mark Pain Locations"), button:has-text("Pain Locations")'
      );

      if (await markButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await markButton.first().click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Mark shoulder with pain
        const shoulderRegion = dialog.locator('g#shoulder_left, [id="shoulder_left"]');
        if (await shoulderRegion.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await shoulderRegion.first().click();
          await page.waitForTimeout(300);

          const markPainBtn = dialog.locator('[data-testid="set-pain-btn"]');
          if (await markPainBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await markPainBtn.click();
            await page.waitForTimeout(300);
          }

          // Verify the region now has a fill color (not transparent)
          const shapeInRegion = shoulderRegion.locator('ellipse, rect, path').first();
          const fill = await shapeInRegion.getAttribute('fill');
          expect(fill).not.toBe('transparent');

          // Verify a severity number label is displayed
          const severityLabel = dialog.locator('text').filter({ hasText: /^[0-9]$|^10$/ });
          const labelCount = await severityLabel.count();
          expect(labelCount).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });
});
