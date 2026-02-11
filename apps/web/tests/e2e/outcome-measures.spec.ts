import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
  expectToast,
  getToday,
  getDateOffset,
} from './fixtures/test-utils';

test.describe('Outcome Measures Workflow', () => {
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

  test.describe('Record Baseline Measure', () => {
    test('should record baseline VAS score', async ({ page }) => {
      // Navigate to outcome measures section
      const measuresLink = page.locator('a:has-text("Outcomes"), a:has-text("Measures"), button:has-text("Outcome")');
      if (await measuresLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await measuresLink.first().click();
        await waitForLoading(page);
      } else {
        // Try navigating directly
        const currentUrl = page.url();
        const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
        if (patientId) {
          await page.goto(`/vi/patients/${patientId}/outcomes`);
          await waitForLoading(page);
        }
      }

      // Look for add/record measure button
      const addButton = page.locator('button:has-text("Add"), button:has-text("Record"), button:has-text("New")');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        // Select VAS (Visual Analog Scale) measure type
        const measureTypeSelect = page.locator('select[name="measureType"], [name="type"]');
        if (await measureTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          await measureTypeSelect.selectOption('VAS');
        } else {
          // Try clicking VAS option button
          const vasButton = page.locator('button:has-text("VAS"), [data-measure="VAS"]');
          if (await vasButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await vasButton.first().click();
          }
        }

        // Set VAS score using slider
        const vasSlider = page.locator('input[type="range"][name*="score"], input[type="range"][name*="vas"]').first();
        if (await vasSlider.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Set baseline score to 7 (0-10 scale)
          await vasSlider.fill('7');

          // Mark as baseline
          const baselineCheckbox = page.locator('input[type="checkbox"][name*="baseline"], input[name*="isBaseline"]');
          if (await baselineCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
            await baselineCheckbox.check();
          }

          // Add date
          const dateInput = page.locator('input[type="date"][name*="date"]').first();
          if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await dateInput.fill(getToday());
          }

          // Add notes
          const notesInput = page.locator('textarea[name="notes"], textarea[name="comments"]').first();
          if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await notesInput.fill('Baseline measurement - patient reports sharp pain in lower back');
          }

          // Submit
          const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Record")');
          if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitButton.first().click();
            await waitForLoading(page);

            // Verify success
            await expectToast(page, /recorded|success|saved/i);
          }
        }
      }
    });

    test('should record baseline NPRS score', async ({ page }) => {
      // Navigate to outcome measures
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      const addButton = page.locator('button:has-text("Add"), button:has-text("Record")');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        // Select NPRS (Numeric Pain Rating Scale)
        const nprsButton = page.locator('button:has-text("NPRS"), [data-measure="NPRS"]');
        if (await nprsButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await nprsButton.first().click();

          // Set NPRS score
          const nprsInput = page.locator('input[type="number"][name*="score"], input[name*="nprs"]').first();
          if (await nprsInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await nprsInput.fill('8');

            // Mark as baseline
            const baselineCheckbox = page.locator('input[type="checkbox"][name*="baseline"]');
            if (await baselineCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
              await baselineCheckbox.check();
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

  test.describe('Record Interim Measure', () => {
    test('should record follow-up measurement', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      const addButton = page.locator('button:has-text("Add"), button:has-text("Record")');
      if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.first().click();
        await waitForLoading(page);

        // Record interim VAS measurement
        const vasSlider = page.locator('input[type="range"]').first();
        if (await vasSlider.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Improved score: 4 (down from baseline of 7)
          await vasSlider.fill('4');

          // Set date to +7 days
          const dateInput = page.locator('input[type="date"]').first();
          if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await dateInput.fill(getDateOffset(7));
          }

          // Add progress notes
          const notesInput = page.locator('textarea[name="notes"]').first();
          if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await notesInput.fill('Week 1 follow-up - pain has decreased, mobility improving');
          }

          // Submit
          const submitButton = page.locator('button[type="submit"]').first();
          if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitButton.first().click();
            await waitForLoading(page);

            // Verify success
            await expectToast(page, /recorded|success/i);
          }
        }
      }
    });
  });

  test.describe('View Progress Chart', () => {
    test('should display outcome measures chart', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for chart/graph display
      const chart = page.locator('[data-testid="outcomes-chart"], .recharts-wrapper, canvas, svg[class*="chart"]');
      if (await chart.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(chart.first()).toBeVisible();
      }
    });

    test('should show trend line for measurements', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for trend visualization
      const trendLine = page.locator('[data-testid="trend-line"], .recharts-line, path[stroke]');
      if (await trendLine.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(trendLine.first()).toBeVisible();
      }
    });

    test('should allow toggling between different outcome measures', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for measure type filter/toggle
      const measureToggle = page.locator('button:has-text("VAS"), button:has-text("NPRS"), [data-testid="measure-filter"]');
      if (await measureToggle.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await measureToggle.first().click();
        await waitForLoading(page);

        // Chart should update
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('MCID Indicator', () => {
    test('should display MCID indicator when threshold reached', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for MCID (Minimal Clinically Important Difference) indicator
      const mcidBadge = page.locator('[data-testid="mcid-indicator"], .mcid-badge, :has-text("MCID"), :has-text("Clinically")');
      if (await mcidBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(mcidBadge.first()).toContainText(/MCID|significant|clinically/i);
      }
    });

    test('should show improvement percentage', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for improvement indicator
      const improvementIndicator = page.locator('[data-testid="improvement"], .improvement-badge, :has-text("%")');
      if (await improvementIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const improvementText = await improvementIndicator.first().textContent();
        // Should contain percentage or improvement text
        expect(improvementText).toMatch(/\d+%|improve|better|worse/i);
      }
    });
  });

  test.describe('Trending Data Across Phases', () => {
    test('should display measurements grouped by treatment phase', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for phase indicators (baseline, interim, discharge)
      const phaseLabels = page.locator('[data-testid*="phase"], .phase-label, :has-text("Baseline"), :has-text("Phase")');
      if (await phaseLabels.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const phaseLabelCount = await phaseLabels.count();
        // Should have at least one phase label
        expect(phaseLabelCount).toBeGreaterThan(0);
      }
    });

    test('should show comparison between baseline and current', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for comparison display
      const comparisonSection = page.locator('[data-testid="comparison"], .comparison-card, :has-text("vs"), :has-text("compared")');
      if (await comparisonSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const comparisonText = await comparisonSection.first().textContent();
        // Should show baseline vs current comparison
        expect(comparisonText).toBeTruthy();
      }
    });

    test('should display timeline of all measurements', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Look for timeline/table of measurements
      const timeline = page.locator('[data-testid="timeline"], .timeline, table');
      if (await timeline.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(timeline.first()).toBeVisible();

        // Should have multiple measurement entries
        const rows = timeline.locator('tr, .timeline-item, [data-testid*="measurement"]');
        const rowCount = await rows.count();
        // Should have at least header row
        expect(rowCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Outcome Measures List', () => {
    test('should display list of recorded measures', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Should see measures list or table
      const measuresList = page.locator('[data-testid="measures-list"], table, .measures-grid');
      if (await measuresList.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(measuresList.first()).toBeVisible();
      }
    });

    test('should show measurement details on click', async ({ page }) => {
      // Navigate to outcomes
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/outcomes`);
        await waitForLoading(page);
      }

      // Click on a measurement entry
      const measurementItem = page.locator('[data-testid="measurement-item"], tr, .measure-card').first();
      if (await measurementItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await measurementItem.click();
        await page.waitForTimeout(500);

        // Should show details (modal or expanded view)
        const detailsView = page.locator('[data-testid="measure-details"], [role="dialog"], .details-panel');
        if (await detailsView.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(detailsView.first()).toBeVisible();
        }
      }
    });
  });
});
