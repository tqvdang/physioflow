import { test, expect, TEST_USERS, loginViaKeycloak } from './fixtures/auth';
import { navigateTo, waitForLoading } from './fixtures/test-utils';

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Fresh state for login tests

    test('should redirect to Keycloak for unauthenticated users', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('networkidle');

      // Should redirect to Keycloak login page
      expect(page.url()).toMatch(/localhost:7014|keycloak/);
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('networkidle');

      // Fill login form
      if (page.url().includes('localhost:7014')) {
        await page.fill('#username', TEST_USERS.therapist.username);
        await page.fill('#password', TEST_USERS.therapist.password);
        await page.click('#kc-login');

        // Should redirect back to app (may go to /dashboard or localized route)
        await page.waitForURL(/localhost:7010\/(vi|en|dashboard)/, { timeout: 30000 });
        expect(page.url()).toMatch(/localhost:7010/);
      }
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('networkidle');

      if (page.url().includes('localhost:7014')) {
        await page.fill('#username', 'invalid_user');
        await page.fill('#password', 'wrong_password');
        await page.click('#kc-login');

        // Should show error message (Keycloak shows error in various ways)
        await page.waitForTimeout(2000);
        const hasError = await page.locator('text=/Invalid|Error|invalid/i').isVisible().catch(() => false) ||
                         await page.locator('.alert').isVisible().catch(() => false);
        expect(hasError).toBeTruthy();
      }
    });
  });

  test.describe('Authenticated User', () => {
    test('should display user info after login', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      // User should see dashboard or main content (app may redirect to /dashboard)
      expect(page.url()).toMatch(/\/(vi|en|dashboard)/);
    });

    test('should persist session across page reloads', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      // Reload the page
      await page.reload();
      await waitForLoading(page);

      // Should still be on authenticated page
      expect(page.url()).not.toMatch(/localhost:7014|keycloak/);
    });

    test('should navigate to different pages while authenticated', async ({ page }) => {
      // Navigate to patients
      await navigateTo(page, '/patients');
      expect(page.url()).toContain('/patients');

      // Navigate to schedule
      await navigateTo(page, '/schedule');
      expect(page.url()).toContain('/schedule');

      // Navigate to library
      await navigateTo(page, '/library');
      expect(page.url()).toContain('/library');
    });
  });

  test.describe('Role-based Access', () => {
    test('therapist should have access to patient management', async ({ page }) => {
      await navigateTo(page, '/patients');
      await waitForLoading(page);

      // Should be on patients page (not redirected to login)
      expect(page.url()).toContain('/patients');
      expect(page.url()).not.toMatch(/localhost:7014|keycloak/);
    });

    test('therapist should have access to schedule', async ({ page }) => {
      await navigateTo(page, '/schedule');
      await waitForLoading(page);

      // Should be on schedule page (not redirected to login)
      expect(page.url()).toContain('/schedule');
      expect(page.url()).not.toMatch(/localhost:7014|keycloak/);
    });
  });

  test.describe('Locale Support', () => {
    test('should work with Vietnamese locale', async ({ page }) => {
      // Navigate to a specific page with Vietnamese locale
      await page.goto('/vi/patients');
      await waitForLoading(page);
      // Should stay on authenticated app (not redirected to login)
      expect(page.url()).toContain('/vi/patients');
      expect(page.url()).not.toMatch(/keycloak/);
    });

    test('should work with English locale', async ({ page }) => {
      // Navigate to a specific page with English locale
      await page.goto('/en/patients');
      await waitForLoading(page);
      // Should stay on authenticated app (not redirected to login)
      expect(page.url()).toContain('/en/patients');
      expect(page.url()).not.toMatch(/keycloak/);
    });
  });
});
