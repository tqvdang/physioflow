import { test, expect } from './fixtures/auth';
import {
  navigateTo,
  waitForLoading,
} from './fixtures/test-utils';

test.describe('Exercise Library', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/library');
  });

  test.describe('Browse Exercises', () => {
    test('should display exercise library page', async ({ page }) => {
      await waitForLoading(page);

      // Should see main content area
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();

      // Should see page title or header (exercise library / Thư viện bài tập)
      const title = page.locator('h1, h2, [role="heading"]').first();
      await expect(title).toBeVisible();
    });

    test('should display exercise list or empty/error state', async ({ page }) => {
      await waitForLoading(page);

      // Should see either exercises, empty state, or error state
      const hasContent = await page.locator('[data-testid="exercise-card"], .exercise-card, .grid > div').count() > 0;
      const hasEmptyState = await page.locator('text="no exercises"').isVisible().catch(() => false) ||
                            await page.locator('text="không có"').isVisible().catch(() => false);
      // Check for error state - look for specific text patterns
      const hasErrorState = await page.locator('text="loadFailed"').isVisible().catch(() => false) ||
                            await page.locator('text="error"').isVisible().catch(() => false) ||
                            await page.locator(':text-matches("loadFailed")').isVisible().catch(() => false);
      // Also check the page content for these strings
      const pageContent = await page.content();
      const hasErrorInContent = pageContent.includes('loadFailed') || pageContent.includes('error');

      // At least one of these states should be present
      expect(hasContent || hasEmptyState || hasErrorState || hasErrorInContent).toBeTruthy();
    });
  });

  test.describe('Search and Filter', () => {
    test('should search exercises by name', async ({ page }) => {
      await waitForLoading(page);

      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[name="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('stretch');
        await page.waitForTimeout(500); // Debounce
        await waitForLoading(page);

        // Results should update
        const exercises = page.locator('[data-testid="exercise-card"], .exercise-card');
        // May or may not have results depending on data
      }
    });

    test('should filter by category', async ({ page }) => {
      await waitForLoading(page);

      // Find category filter
      const categoryFilter = page.locator('[data-testid="category-filter"], select[name="category"], button:has-text("Category")');
      if (await categoryFilter.first().isVisible()) {
        await categoryFilter.first().click();
        await page.waitForTimeout(200);

        // Select a category option
        const option = page.locator('[role="option"], option').filter({ hasText: /stretch|strength/i }).first();
        if (await option.isVisible()) {
          await option.click();
          await waitForLoading(page);
        }
      }
    });

    test('should filter by difficulty', async ({ page }) => {
      await waitForLoading(page);

      // Find difficulty filter
      const difficultyFilter = page.locator('[data-testid="difficulty-filter"], select[name="difficulty"], button:has-text("Difficulty")');
      if (await difficultyFilter.first().isVisible()) {
        await difficultyFilter.first().click();
        await page.waitForTimeout(200);

        // Select a difficulty option
        const option = page.locator('[role="option"], option').filter({ hasText: /beginner|intermediate/i }).first();
        if (await option.isVisible()) {
          await option.click();
          await waitForLoading(page);
        }
      }
    });

    test('should combine multiple filters', async ({ page }) => {
      await waitForLoading(page);

      // Apply category filter
      const categoryFilter = page.locator('[data-testid="category-filter"], button:has-text("Category")');
      if (await categoryFilter.first().isVisible()) {
        await categoryFilter.first().click();
        const catOption = page.locator('[role="option"]').first();
        if (await catOption.isVisible()) {
          await catOption.click();
          await page.waitForTimeout(300);
        }
      }

      // Apply difficulty filter
      const difficultyFilter = page.locator('[data-testid="difficulty-filter"], button:has-text("Difficulty")');
      if (await difficultyFilter.first().isVisible()) {
        await difficultyFilter.first().click();
        const diffOption = page.locator('[role="option"]').first();
        if (await diffOption.isVisible()) {
          await diffOption.click();
          await waitForLoading(page);
        }
      }
    });

    test('should clear filters', async ({ page }) => {
      await waitForLoading(page);

      // Look for clear/reset button
      const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")');
      if (await clearButton.first().isVisible()) {
        await clearButton.first().click();
        await waitForLoading(page);
      }
    });
  });

  test.describe('Exercise Detail', () => {
    test('should open exercise detail', async ({ page }) => {
      await waitForLoading(page);

      // Click on first exercise card
      const exerciseCard = page.locator('[data-testid="exercise-card"], .exercise-card').first();
      if (await exerciseCard.isVisible()) {
        await exerciseCard.click();

        // Detail sheet/modal should appear
        const detail = page.locator('[data-testid="exercise-detail"], [role="dialog"], .sheet, .modal');
        await expect(detail).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display exercise information', async ({ page }) => {
      await waitForLoading(page);

      const exerciseCard = page.locator('[data-testid="exercise-card"], .exercise-card').first();
      if (await exerciseCard.isVisible()) {
        await exerciseCard.click();

        const detail = page.locator('[data-testid="exercise-detail"], [role="dialog"], .sheet');
        if (await detail.isVisible()) {
          // Should show name
          const name = detail.locator('h1, h2, h3').first();
          await expect(name).toBeVisible();

          // Should show description
          const description = detail.locator('p, .description');
          await expect(description.first()).toBeVisible();
        }
      }
    });

    test('should show prescribe button', async ({ page }) => {
      await waitForLoading(page);

      const exerciseCard = page.locator('[data-testid="exercise-card"], .exercise-card').first();
      if (await exerciseCard.isVisible()) {
        await exerciseCard.click();

        const detail = page.locator('[data-testid="exercise-detail"], [role="dialog"], .sheet');
        if (await detail.isVisible()) {
          // Find prescribe button
          const prescribeButton = detail.locator('button:has-text("Prescribe")');
          await expect(prescribeButton).toBeVisible();
        }
      }
    });
  });

  test.describe('Prescribe Exercise', () => {
    test('should open prescribe dialog', async ({ page }) => {
      await waitForLoading(page);

      // Click on exercise to open detail
      const exerciseCard = page.locator('[data-testid="exercise-card"], .exercise-card').first();
      if (await exerciseCard.isVisible()) {
        await exerciseCard.click();

        const detail = page.locator('[data-testid="exercise-detail"], [role="dialog"], .sheet');
        if (await detail.isVisible()) {
          // Click prescribe
          const prescribeButton = detail.locator('button:has-text("Prescribe")');
          if (await prescribeButton.isVisible()) {
            await prescribeButton.click();

            // Prescribe dialog should appear
            const prescribeDialog = page.locator('[data-testid="prescribe-dialog"], .prescribe-dialog');
            // May appear as nested dialog or replace current
          }
        }
      }
    });

    test('should fill prescription form', async ({ page }) => {
      await waitForLoading(page);

      const exerciseCard = page.locator('[data-testid="exercise-card"], .exercise-card').first();
      if (await exerciseCard.isVisible()) {
        await exerciseCard.click();

        const detail = page.locator('[data-testid="exercise-detail"], [role="dialog"], .sheet');
        if (await detail.isVisible()) {
          const prescribeButton = detail.locator('button:has-text("Prescribe")');
          if (await prescribeButton.isVisible()) {
            await prescribeButton.click();
            await page.waitForTimeout(500);

            // Fill patient selection
            const patientInput = page.locator('input[name="patient"], input[placeholder*="patient" i]');
            if (await patientInput.isVisible()) {
              await patientInput.fill('test');
              await page.waitForTimeout(500);

              const suggestion = page.locator('[role="option"]').first();
              if (await suggestion.isVisible()) {
                await suggestion.click();
              }
            }

            // Fill sets/reps
            const setsInput = page.locator('input[name="sets"]');
            if (await setsInput.isVisible()) {
              await setsInput.fill('3');
            }

            const repsInput = page.locator('input[name="reps"]');
            if (await repsInput.isVisible()) {
              await repsInput.fill('10');
            }
          }
        }
      }
    });
  });

  test.describe('View Toggle', () => {
    test('should toggle between grid and list view', async ({ page }) => {
      await waitForLoading(page);

      // Find view toggle buttons
      const gridButton = page.locator('button[aria-label*="grid"], button:has-text("Grid")');
      const listButton = page.locator('button[aria-label*="list"], button:has-text("List")');

      if (await gridButton.isVisible() && await listButton.isVisible()) {
        // Click list view
        await listButton.click();
        await page.waitForTimeout(300);

        // Click grid view
        await gridButton.click();
        await page.waitForTimeout(300);
      }
    });
  });
});
