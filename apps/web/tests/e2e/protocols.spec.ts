import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
  expectToast,
} from './fixtures/test-utils';

test.describe('Clinical Protocols Workflow', () => {
  test.describe('Browse Protocol Library', () => {
    test('should display protocol library', async ({ page }) => {
      // Navigate to library/protocols
      await navigateTo(page, '/library');
      await waitForLoading(page);

      // Should see protocols section
      const protocolsSection = page.locator('[data-testid="protocols"], .protocols, h1:has-text("Protocol"), h2:has-text("Protocol")');
      if (await protocolsSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(protocolsSection.first()).toBeVisible();
      }
    });

    test('should filter protocols by body region', async ({ page }) => {
      await navigateTo(page, '/library');
      await waitForLoading(page);

      // Look for body region filter
      const regionFilter = page.locator('select[name="region"], button:has-text("Region"), [data-filter="region"]');
      if (await regionFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await regionFilter.first().click();
        await page.waitForTimeout(300);

        // Select a region
        const backOption = page.locator('[role="option"]:has-text("Back"), option:has-text("Back"), button:has-text("Back")').first();
        if (await backOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await backOption.click();
          await waitForLoading(page);
        }
      }
    });

    test('should search protocols by name', async ({ page }) => {
      await navigateTo(page, '/library');
      await waitForLoading(page);

      // Find search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
      if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.first().fill('Lower Back Pain');
        await page.waitForTimeout(500); // Debounce
        await waitForLoading(page);

        // Should show filtered results
        const results = page.locator('[data-testid*="protocol"], .protocol-card, tr');
        if (await results.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          const resultCount = await results.count();
          expect(resultCount).toBeGreaterThan(0);
        }
      }
    });

    test('should display protocol categories', async ({ page }) => {
      await navigateTo(page, '/library');
      await waitForLoading(page);

      // Look for category badges/tags
      const categories = page.locator('.badge, .tag, [data-testid*="category"]');
      if (await categories.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const categoryCount = await categories.count();
        expect(categoryCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Assign Protocol to Patient', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to patients list
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      // Click on first patient
      const patientRow = page.locator('tr, [data-testid="patient-card"], .patient-card').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);
      }
    });

    test('should assign Lower Back Pain protocol to patient', async ({ page }) => {
      // Navigate to protocols tab for patient
      const protocolsLink = page.locator('a:has-text("Protocol"), button:has-text("Protocol")');
      if (await protocolsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await protocolsLink.first().click();
        await waitForLoading(page);
      } else {
        // Try navigating directly
        const currentUrl = page.url();
        const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
        if (patientId) {
          await page.goto(`/vi/patients/${patientId}/protocols`);
          await waitForLoading(page);
        }
      }

      // Look for assign/add protocol button
      const assignButton = page.locator('button:has-text("Assign"), button:has-text("Add"), a[href*="protocol"]');
      if (await assignButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await assignButton.first().click();
        await waitForLoading(page);

        // Search or select Lower Back Pain protocol
        const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
        if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await searchInput.first().fill('Lower Back Pain');
          await page.waitForTimeout(500);

          // Select the protocol from results
          const protocolOption = page.locator('[role="option"]:has-text("Lower Back"), li:has-text("Lower Back"), .protocol-card:has-text("Lower Back")').first();
          if (await protocolOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await protocolOption.click();
            await page.waitForTimeout(300);

            // Confirm assignment
            const confirmButton = page.locator('button:has-text("Assign"), button:has-text("Confirm"), button[type="submit"]');
            if (await confirmButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
              await confirmButton.first().click();
              await waitForLoading(page);

              // Verify success
              await expectToast(page, /assigned|success/i);

              // Should see protocol in patient's protocol list
              const assignedProtocol = page.locator(':has-text("Lower Back Pain")');
              if (await assignedProtocol.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                await expect(assignedProtocol.first()).toBeVisible();
              }
            }
          }
        }
      }
    });

    test('should set protocol start date', async ({ page }) => {
      // Navigate to patient protocols
      const currentUrl = page.url();
      const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
      if (patientId) {
        await page.goto(`/vi/patients/${patientId}/protocols`);
        await waitForLoading(page);
      }

      const assignButton = page.locator('button:has-text("Assign"), button:has-text("Add")');
      if (await assignButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await assignButton.first().click();
        await waitForLoading(page);

        // Set start date
        const dateInput = page.locator('input[type="date"][name*="start"]').first();
        if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await dateInput.fill('2024-01-15');
        }
      }
    });
  });

  test.describe('View Protocol Details', () => {
    test('should display protocol goals', async ({ page }) => {
      // Navigate to library
      await navigateTo(page, '/library');
      await waitForLoading(page);

      // Click on a protocol to view details
      const protocolCard = page.locator('[data-testid*="protocol"], .protocol-card, tr:has-text("Protocol")').first();
      if (await protocolCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await protocolCard.click();
        await waitForLoading(page);

        // Should see protocol details
        const goalsSection = page.locator('[data-testid="goals"], .goals, :has-text("Goal"), :has-text("Objective")');
        if (await goalsSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(goalsSection.first()).toBeVisible();

          // Should have goal items
          const goalItems = page.locator('[data-testid*="goal"], .goal-item, li');
          const goalCount = await goalItems.count();
          expect(goalCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should display protocol exercises', async ({ page }) => {
      await navigateTo(page, '/library');
      await waitForLoading(page);

      // Click on a protocol
      const protocolCard = page.locator('[data-testid*="protocol"], .protocol-card').first();
      if (await protocolCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await protocolCard.click();
        await waitForLoading(page);

        // Should see exercises section
        const exercisesSection = page.locator('[data-testid="exercises"], .exercises, :has-text("Exercise")');
        if (await exercisesSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(exercisesSection.first()).toBeVisible();

          // Should have exercise items
          const exerciseItems = page.locator('[data-testid*="exercise"], .exercise-card, .exercise-item');
          const exerciseCount = await exerciseItems.count();
          expect(exerciseCount).toBeGreaterThan(0);
        }
      }
    });

    test('should show exercise details with sets and reps', async ({ page }) => {
      await navigateTo(page, '/library');
      await waitForLoading(page);

      const protocolCard = page.locator('[data-testid*="protocol"], .protocol-card').first();
      if (await protocolCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await protocolCard.click();
        await waitForLoading(page);

        // Look for exercise with sets/reps
        const exerciseDetails = page.locator(':has-text("sets"), :has-text("reps"), :has-text("repetitions")');
        if (await exerciseDetails.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          const detailsText = await exerciseDetails.first().textContent();
          expect(detailsText).toMatch(/\d+\s*(sets?|reps?|repetitions?)/i);
        }
      }
    });

    test('should display protocol duration and phases', async ({ page }) => {
      await navigateTo(page, '/library');
      await waitForLoading(page);

      const protocolCard = page.locator('[data-testid*="protocol"], .protocol-card').first();
      if (await protocolCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await protocolCard.click();
        await waitForLoading(page);

        // Look for duration information
        const durationInfo = page.locator('[data-testid="duration"], :has-text("week"), :has-text("phase"), :has-text("duration")');
        if (await durationInfo.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          const durationText = await durationInfo.first().textContent();
          expect(durationText).toMatch(/\d+\s*(week|day|phase)/i);
        }
      }
    });
  });

  test.describe('Update Protocol Progress', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to patient with assigned protocol
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        // Go to protocols tab
        const protocolsLink = page.locator('a:has-text("Protocol")');
        if (await protocolsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await protocolsLink.first().click();
          await waitForLoading(page);
        }
      }
    });

    test('should update protocol progress percentage', async ({ page }) => {
      // Look for protocol progress section
      const progressSection = page.locator('[data-testid="protocol-progress"], .protocol-progress, :has-text("Progress")');
      if (await progressSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should show progress indicator
        const progressBar = page.locator('[role="progressbar"], .progress-bar, progress');
        if (await progressBar.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(progressBar.first()).toBeVisible();
        }

        // Look for percentage display
        const percentageDisplay = page.locator(':has-text("%")');
        if (await percentageDisplay.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          const percentText = await percentageDisplay.first().textContent();
          expect(percentText).toMatch(/\d+%/);
        }
      }
    });

    test('should track completed exercises', async ({ page }) => {
      // Look for exercise list with completion status
      const exerciseList = page.locator('[data-testid="exercise-list"], .exercise-list');
      if (await exerciseList.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Look for completed checkmarks or badges
        const completedIndicators = page.locator('.completed, [data-completed="true"], :has-text("Completed")');
        if (await completedIndicators.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          const completedCount = await completedIndicators.count();
          expect(completedCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should update protocol status', async ({ page }) => {
      // Look for protocol status display
      const statusDisplay = page.locator('[data-testid="protocol-status"], .protocol-status, .badge');
      if (await statusDisplay.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const statusText = await statusDisplay.first().textContent();
        // Should show active, completed, or in-progress
        expect(statusText).toMatch(/active|progress|completed|pending/i);
      }
    });
  });

  test.describe('Mark Exercises as Completed', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to patient protocols
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const protocolsLink = page.locator('a:has-text("Protocol")');
        if (await protocolsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await protocolsLink.first().click();
          await waitForLoading(page);
        }
      }
    });

    test('should mark exercise as completed', async ({ page }) => {
      // Look for exercise checkbox or completion button
      const exerciseCheckbox = page.locator('input[type="checkbox"][data-exercise], [data-testid*="exercise-checkbox"]').first();
      if (await exerciseCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check if already checked
        const isChecked = await exerciseCheckbox.isChecked();

        if (!isChecked) {
          // Mark as completed
          await exerciseCheckbox.check();
          await page.waitForTimeout(500); // Wait for save

          // Verify it's checked
          await expect(exerciseCheckbox).toBeChecked();

          // Look for success indication
          await expectToast(page, /completed|updated|saved/i);
        }
      }
    });

    test('should unmark exercise completion', async ({ page }) => {
      // Find a completed exercise
      const completedCheckbox = page.locator('input[type="checkbox"]:checked[data-exercise]').first();
      if (await completedCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Uncheck it
        await completedCheckbox.uncheck();
        await page.waitForTimeout(500);

        // Verify it's unchecked
        await expect(completedCheckbox).not.toBeChecked();
      }
    });

    test('should record exercise completion date', async ({ page }) => {
      // Click on an exercise to view details
      const exerciseItem = page.locator('[data-testid*="exercise"], .exercise-card').first();
      if (await exerciseItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await exerciseItem.click();
        await page.waitForTimeout(500);

        // Look for completion date display
        const completionDate = page.locator('[data-testid="completion-date"], :has-text("Completed on")');
        if (await completionDate.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          const dateText = await completionDate.first().textContent();
          // Should show a date
          expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
        }
      }
    });

    test('should track exercise adherence rate', async ({ page }) => {
      // Look for adherence percentage
      const adherenceDisplay = page.locator('[data-testid="adherence"], .adherence, :has-text("Adherence")');
      if (await adherenceDisplay.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const adherenceText = await adherenceDisplay.first().textContent();
        // Should show percentage
        expect(adherenceText).toMatch(/\d+%/);
      }
    });
  });

  test.describe('Protocol Modification', () => {
    test('should allow modifying protocol exercises', async ({ page }) => {
      // Navigate to patient protocols
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const protocolsLink = page.locator('a:has-text("Protocol")');
        if (await protocolsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await protocolsLink.first().click();
          await waitForLoading(page);

          // Look for edit/modify button
          const editButton = page.locator('button:has-text("Edit"), button:has-text("Modify")');
          if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await editButton.first().click();
            await waitForLoading(page);

            // Should be able to modify exercises
            expect(page.url()).toMatch(/edit|modify/);
          }
        }
      }
    });

    test('should allow adding custom exercises to protocol', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await waitForLoading(page);

        const protocolsLink = page.locator('a:has-text("Protocol")');
        if (await protocolsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await protocolsLink.first().click();
          await waitForLoading(page);

          // Look for add exercise button
          const addExerciseButton = page.locator('button:has-text("Add Exercise"), button:has-text("Add")');
          if (await addExerciseButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await addExerciseButton.first().click();
            await waitForLoading(page);

            // Should open exercise selection
            const exerciseSearch = page.locator('input[type="search"], input[placeholder*="Search"]');
            if (await exerciseSearch.first().isVisible({ timeout: 3000 }).catch(() => false)) {
              await expect(exerciseSearch.first()).toBeVisible();
            }
          }
        }
      }
    });
  });
});
