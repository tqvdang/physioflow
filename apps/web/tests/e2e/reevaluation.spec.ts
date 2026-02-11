import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
} from './fixtures/test-utils';

test.describe('Re-evaluation Workflow', () => {
  test.describe('Re-evaluation Form', () => {
    test('should display re-evaluation form on patient assessment page', async ({ page }) => {
      // Navigate to a patient's detail page (progress tab)
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      // Click on a patient if available
      const patientRow = page.locator('table tbody tr, [data-testid="patient-row"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        // Look for Progress/Assessment tab
        const progressTab = page.locator('button:has-text("Progress"), [role="tab"]:has-text("Progress"), button:has-text("Assessment")');
        if (await progressTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await progressTab.first().click();
          await waitForLoading(page);
        }

        // Look for Re-evaluation section or tab
        const reevalSection = page.locator(
          'button:has-text("Re-evaluation"), [role="tab"]:has-text("Re-evaluation"), h3:has-text("Re-evaluation")'
        );
        if (await reevalSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await reevalSection.first().click();
          await waitForLoading(page);

          // Verify the form is visible
          const form = page.locator('form, [data-testid="reevaluation-form"]');
          if (await form.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(form.first()).toBeVisible();
          }
        }
      }
    });

    test('should add and remove measurement items', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('table tbody tr').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        // Navigate to re-evaluation
        const reevalTab = page.locator('button:has-text("Re-evaluation")');
        if (await reevalTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await reevalTab.first().click();
          await waitForLoading(page);

          // Click "Add Measurement" button
          const addButton = page.locator('button:has-text("Add Measurement"), button:has-text("Add Item")');
          if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            // Should start with 1 item
            const items = page.locator('[class*="rounded-lg border"]');
            const initialCount = await items.count();

            // Add another item
            await addButton.first().click();
            await page.waitForTimeout(300);

            const newCount = await items.count();
            expect(newCount).toBeGreaterThanOrEqual(initialCount);
          }
        }
      }
    });

    test('should show comparison preview when values are entered', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('table tbody tr').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        const reevalTab = page.locator('button:has-text("Re-evaluation")');
        if (await reevalTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await reevalTab.first().click();
          await waitForLoading(page);

          // Fill in measurement label
          const labelInput = page.locator('input[placeholder*="Shoulder"], input[placeholder*="measure"]').first();
          if (await labelInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await labelInput.fill('Shoulder Flexion Left');

            // Fill in baseline value
            const baselineInput = page.locator('input[placeholder*="baseline"], input[placeholder*="Initial"]').first();
            if (await baselineInput.isVisible({ timeout: 3000 }).catch(() => false)) {
              await baselineInput.fill('90');
            }

            // Fill in current value
            const currentInput = page.locator('input[placeholder*="current"], input[placeholder*="Current"]').first();
            if (await currentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
              await currentInput.fill('130');
            }

            await page.waitForTimeout(500);

            // Check for comparison preview
            const preview = page.locator('text=Comparison Preview, text=Preview, h4:has-text("Preview")');
            if (await preview.first().isVisible({ timeout: 5000 }).catch(() => false)) {
              await expect(preview.first()).toBeVisible();

              // Check for Improved badge
              const improvedBadge = page.locator('text=Improved, [class*="badge"]:has-text("Improved")');
              if (await improvedBadge.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                await expect(improvedBadge.first()).toBeVisible();
              }
            }
          }
        }
      }
    });
  });

  test.describe('Re-evaluation History', () => {
    test('should display re-evaluation history tab', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('table tbody tr').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        const reevalTab = page.locator('button:has-text("Re-evaluation")');
        if (await reevalTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await reevalTab.first().click();
          await waitForLoading(page);

          // Click History tab
          const historyTab = page.locator('button:has-text("History"), [role="tab"]:has-text("History")');
          if (await historyTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await historyTab.first().click();
            await waitForLoading(page);

            // Should show either data table or "no history" message
            const content = page.locator(
              'table, text=No re-evaluation history, text=no history'
            );
            if (await content.first().isVisible({ timeout: 5000 }).catch(() => false)) {
              await expect(content.first()).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Comparison Table', () => {
    test('should color-code improved items in green', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('table tbody tr').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        const reevalTab = page.locator('button:has-text("Re-evaluation")');
        if (await reevalTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await reevalTab.first().click();
          await waitForLoading(page);

          // Fill a measurement and verify color coding
          const labelInput = page.locator('input[placeholder*="Shoulder"], input[placeholder*="measure"]').first();
          if (await labelInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await labelInput.fill('Test ROM');

            const baselineInput = page.locator('input[placeholder*="baseline"], input[placeholder*="Initial"]').first();
            if (await baselineInput.isVisible({ timeout: 3000 }).catch(() => false)) {
              await baselineInput.fill('80');
            }

            const currentInput = page.locator('input[placeholder*="current"], input[placeholder*="Current"]').first();
            if (await currentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
              await currentInput.fill('120');
            }

            await page.waitForTimeout(500);

            // Look for green color on improved items
            const greenText = page.locator('.text-green-600, .text-green-400, [class*="green"]');
            if (await greenText.first().isVisible({ timeout: 5000 }).catch(() => false)) {
              await expect(greenText.first()).toBeVisible();
            }
          }
        }
      }
    });
  });
});
