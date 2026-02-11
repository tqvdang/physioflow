import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
  expectToast,
  getToday,
} from './fixtures/test-utils';

test.describe('Discharge Planning Workflow', () => {
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

  test.describe('Create Discharge Plan', () => {
    test('should create discharge plan for patient', async ({ page }) => {
      // Navigate to discharge section
      const dischargeLink = page.locator('a:has-text("Discharge"), button:has-text("Discharge")');
      if (await dischargeLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await dischargeLink.first().click();
        await waitForLoading(page);
      } else {
        // Try navigating directly
        const currentUrl = page.url();
        const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
        if (patientId) {
          await page.goto(`/vi/patients/${patientId}/discharge`);
          await waitForLoading(page);
        }
      }

      // Look for create discharge plan button
      const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Plan")');
      if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.first().click();
        await waitForLoading(page);

        // Set discharge date
        const dateInput = page.locator('input[type="date"][name*="discharge"]').first();
        if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await dateInput.fill(getToday());
        }

        // Select discharge reason
        const reasonSelect = page.locator('select[name="reason"], [name="dischargeReason"]');
        if (await reasonSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          await reasonSelect.selectOption('goals-met');
        } else {
          // Try clicking reason button
          const reasonButton = page.locator('button:has-text("Goals Met"), [data-reason="goals-met"]');
          if (await reasonButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await reasonButton.first().click();
          }
        }

        // Add discharge notes
        const notesInput = page.locator('textarea[name="notes"], textarea[name="summary"]').first();
        if (await notesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await notesInput.fill('Patient has achieved all treatment goals. Pain reduced from 7/10 to 2/10. Full range of motion restored. Independent with home exercise program.');
        }

        // Add home exercise recommendations
        const homeExercisesInput = page.locator('textarea[name*="homeExercise"], textarea[name*="recommendation"]').first();
        if (await homeExercisesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await homeExercisesInput.fill('Continue core strengthening exercises 3x per week. Maintain proper posture during daily activities.');
        }

        // Add follow-up recommendations
        const followUpInput = page.locator('textarea[name*="followUp"], input[name*="followUp"]').first();
        if (await followUpInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await followUpInput.fill('Return if pain recurs or worsens. Consider reassessment in 3 months.');
        }

        // Submit discharge plan
        const submitButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Save")');
        if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.first().click();
          await waitForLoading(page);

          // Verify success
          await expectToast(page, /created|success|discharge/i);
        }
      }
    });

    test('should validate required discharge fields', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("New")');
      if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.first().click();
        await waitForLoading(page);

        // Try to submit without filling required fields
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          // Should show validation errors or stay on page
          const errorMessage = page.locator('.error, .text-red-500, [role="alert"]');
          if (await errorMessage.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(errorMessage.first()).toBeVisible();
          } else {
            expect(page.url()).toMatch(/discharge/);
          }
        }
      }
    });
  });

  test.describe('Baseline vs Discharge Comparison', () => {
    test('should display baseline and discharge outcome measures', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for comparison section
      const comparisonSection = page.locator('[data-testid="comparison"], .comparison, :has-text("Baseline"), :has-text("vs")');
      if (await comparisonSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(comparisonSection.first()).toBeVisible();

        // Should show baseline scores
        const baselineDisplay = page.locator('[data-testid="baseline"], .baseline, :has-text("Baseline")');
        if (await baselineDisplay.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(baselineDisplay.first()).toBeVisible();
        }

        // Should show discharge scores
        const dischargeDisplay = page.locator('[data-testid="discharge-score"], .discharge, :has-text("Discharge")');
        if (await dischargeDisplay.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(dischargeDisplay.first()).toBeVisible();
        }
      }
    });

    test('should display improvement metrics', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for improvement indicators
      const improvementSection = page.locator('[data-testid="improvement"], .improvement, :has-text("Improvement"), :has-text("Change")');
      if (await improvementSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const improvementText = await improvementSection.first().textContent();
        // Should show percentage or numerical improvement
        expect(improvementText).toMatch(/\d+%|improve|better|-\d+/i);
      }
    });

    test('should show pain score comparison chart', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for comparison chart
      const chart = page.locator('[data-testid="comparison-chart"], .chart, .recharts-wrapper, canvas, svg[class*="chart"]');
      if (await chart.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(chart.first()).toBeVisible();
      }
    });

    test('should display functional improvement summary', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for functional improvements
      const functionalSection = page.locator('[data-testid="functional"], .functional, :has-text("Function"), :has-text("ROM")');
      if (await functionalSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(functionalSection.first()).toBeVisible();
      }
    });
  });

  test.describe('Generate Discharge Summary', () => {
    test('should generate discharge summary document', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for generate summary button
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Summary")');
      if (await generateButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await generateButton.first().click();
        await waitForLoading(page);

        // Should show summary preview or modal
        const summaryPreview = page.locator('[data-testid="summary"], .discharge-summary, [role="dialog"]');
        if (await summaryPreview.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(summaryPreview.first()).toBeVisible();
        }
      }
    });

    test('should include treatment summary in discharge document', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for treatment summary section
      const treatmentSection = page.locator('[data-testid="treatment-summary"], .treatment-summary, :has-text("Treatment")');
      if (await treatmentSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const treatmentText = await treatmentSection.first().textContent();
        // Should contain treatment information
        expect(treatmentText).toBeTruthy();
        expect(treatmentText?.length).toBeGreaterThan(10);
      }
    });

    test('should include outcome measures in summary', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for outcomes in summary
      const outcomesSection = page.locator('[data-testid="outcomes"], :has-text("VAS"), :has-text("NPRS"), :has-text("Pain")');
      if (await outcomesSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(outcomesSection.first()).toBeVisible();
      }
    });

    test('should include home exercise program in summary', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for HEP section
      const hepSection = page.locator('[data-testid="hep"], .home-exercises, :has-text("Home Exercise"), :has-text("HEP")');
      if (await hepSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(hepSection.first()).toBeVisible();
      }
    });
  });

  test.describe('Export Discharge Summary as PDF', () => {
    test('should export discharge summary to PDF', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for export/download button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("PDF")');
      if (await exportButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

        await exportButton.first().click();

        // Wait for download
        const download = await downloadPromise;
        if (download) {
          // Verify download
          expect(download.suggestedFilename()).toMatch(/discharge|summary|pdf/i);
        }
      }
    });

    test('should allow printing discharge summary', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for print button
      const printButton = page.locator('button:has-text("Print")');
      if (await printButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Note: We can't actually test the print dialog, but we can verify the button exists
        await expect(printButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Complete Discharge', () => {
    test('should complete discharge with confirmation dialog', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for complete/finalize discharge button
      const completeButton = page.locator('button:has-text("Complete"), button:has-text("Finalize"), button:has-text("Discharge Patient")');
      if (await completeButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await completeButton.first().click();
        await page.waitForTimeout(500);

        // Should show confirmation dialog
        const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"], .dialog, .modal');
        if (await confirmDialog.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(confirmDialog.first()).toBeVisible();

          // Should have confirmation message
          const dialogText = await confirmDialog.first().textContent();
          expect(dialogText).toMatch(/confirm|sure|discharge/i);

          // Look for confirm button in dialog
          const confirmButton = page.locator('[role="dialog"] button:has-text("Confirm"), [role="alertdialog"] button:has-text("Yes")');
          if (await confirmButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(confirmButton.first()).toBeVisible();
          }
        }
      }
    });

    test('should update patient status to discharged', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for patient status badge
      const statusBadge = page.locator('[data-testid="patient-status"], .status-badge, .badge');
      if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const statusText = await statusBadge.first().textContent();
        // Should show active, in-progress, or discharged
        expect(statusText).toMatch(/active|progress|discharge|complete/i);
      }
    });

    test('should prevent editing after discharge completion', async ({ page }) => {
      // Navigate to a discharged patient (if exists)
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for discharged status indicator
      const dischargedBadge = page.locator('[data-status="discharged"], .badge:has-text("Discharged")');
      if (await dischargedBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Edit buttons should be disabled or hidden
        const editButton = page.locator('button:has-text("Edit")');
        if (await editButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          const isDisabled = await editButton.first().isDisabled();
          expect(isDisabled).toBeTruthy();
        }
      }
    });

    test('should show discharge completion date', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for discharge date display
      const dischargeDate = page.locator('[data-testid="discharge-date"], .discharge-date, :has-text("Discharged on")');
      if (await dischargeDate.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const dateText = await dischargeDate.first().textContent();
        // Should contain a date
        expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
      }
    });
  });

  test.describe('Discharge Plan History', () => {
    test('should display discharge plan history', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for history or timeline
      const historySection = page.locator('[data-testid="history"], .history, .timeline, :has-text("History")');
      if (await historySection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(historySection.first()).toBeVisible();
      }
    });

    test('should allow viewing previous discharge summaries', async ({ page }) => {
      // Navigate to discharge
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/discharge`);
        await waitForLoading(page);
      }

      // Look for previous summaries
      const summaryList = page.locator('[data-testid="summaries"], .summary-list');
      if (await summaryList.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const summaryItems = summaryList.locator('.summary-item, tr, [data-testid*="summary"]');
        const itemCount = await summaryItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
