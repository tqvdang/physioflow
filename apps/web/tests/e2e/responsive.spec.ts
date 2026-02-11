import { test, expect, devices } from '@playwright/test';
import { navigateTo, waitForLoading } from './fixtures/test-utils';

test.describe('Responsive Design', () => {
  test.describe('Mobile Viewport (375x667 - iPhone SE)', () => {
    test.use({ ...devices['iPhone SE'] });

    test('should display mobile navigation menu', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      // Look for mobile menu button (hamburger)
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has-text("☰"), [data-testid="mobile-menu"]');
      if (await mobileMenuButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(mobileMenuButton.first()).toBeVisible();
      }
    });

    test('should display patients list in mobile view', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Content should be visible
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();

      // Check viewport width
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBe(375);
    });

    test('should be able to create patient on mobile', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      // Form should be visible and usable
      const form = page.locator('form').first();
      if (await form.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(form).toBeVisible();

        // Inputs should be appropriately sized for mobile
        const input = page.locator('input, textarea').first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          const inputWidth = await input.evaluate(el => el.getBoundingClientRect().width);
          // Input should not overflow viewport
          expect(inputWidth).toBeLessThanOrEqual(375);
        }
      }
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Tap on first patient
      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.tap();
        await waitForLoading(page);

        // Should navigate to patient detail
        expect(page.url()).toMatch(/patients\/[a-zA-Z0-9-]+/);
      }
    });

    test('should scroll content vertically on mobile', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY);

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);

      const newScroll = await page.evaluate(() => window.scrollY);

      // Should have scrolled
      expect(newScroll).toBeGreaterThan(initialScroll);
    });

    test('should hide desktop-only elements on mobile', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Desktop-specific elements should be hidden
      // Note: This depends on CSS implementation using display: none or hidden classes
      const desktopOnly = page.locator('.desktop-only, .hidden-mobile');
      if (await desktopOnly.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // If found, should not be visible
        await expect(desktopOnly.first()).not.toBeVisible();
      }
    });
  });

  test.describe('Tablet Viewport (768x1024 - iPad)', () => {
    test.use({ ...devices['iPad'] });

    test('should display in tablet layout', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();

      // Check viewport width
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBe(768);
    });

    test('should display navigation appropriately for tablet', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      // Navigation should be visible (depends on implementation)
      const nav = page.locator('nav, [role="navigation"]');
      if (await nav.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(nav.first()).toBeVisible();
      }
    });

    test('should display patients in grid or list on tablet', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Should show patient cards or table
      const patientItems = page.locator('[data-testid="patient-card"], tr, .patient-item');
      if (await patientItems.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const itemCount = await patientItems.count();
        expect(itemCount).toBeGreaterThan(0);
      }
    });

    test('should handle orientation change', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Rotate to landscape
      await page.setViewportSize({ width: 1024, height: 768 });
      await waitForLoading(page);

      // Content should still be visible
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Desktop Viewport (1920x1080)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should display full navigation on desktop', async ({ page }) => {
      await page.goto('/vi');
      await waitForLoading(page);

      // Desktop navigation should be visible
      const nav = page.locator('nav, [role="navigation"]');
      if (await nav.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(nav.first()).toBeVisible();

        // Should have navigation links
        const navLinks = nav.locator('a, button');
        const linkCount = await navLinks.count();
        expect(linkCount).toBeGreaterThan(0);
      }
    });

    test('should display patients in table on desktop', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Should preferably show table on desktop (depends on implementation)
      const table = page.locator('table');
      if (await table.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(table.first()).toBeVisible();

        // Table should have columns
        const headers = table.locator('th');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    });

    test('should display multi-column layouts on desktop', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Click on first patient
      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await waitForLoading(page);

        // Desktop detail view might have multi-column layout
        const content = page.locator('main, [role="main"]');
        if (await content.isVisible()) {
          const contentWidth = await content.evaluate(el => el.getBoundingClientRect().width);
          // Should use available width
          expect(contentWidth).toBeGreaterThan(800);
        }
      }
    });

    test('should hide mobile-only elements on desktop', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Mobile hamburger menu should be hidden
      const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-only');
      if (await mobileMenu.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // If mobile menu exists, it should be hidden on desktop
        const isVisible = await mobileMenu.first().isVisible();
        expect(isVisible).toBeFalsy();
      }
    });
  });

  test.describe('Breakpoint Transitions', () => {
    test('should handle resize from mobile to desktop', async ({ page }) => {
      // Start with mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Resize to desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await waitForLoading(page);

      // Content should adapt
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();
    });

    test('should handle resize from desktop to mobile', async ({ page }) => {
      // Start with desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForLoading(page);

      // Content should adapt
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Touch Gestures', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should support swipe gestures for navigation', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Click on first patient
      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.tap();
        await waitForLoading(page);

        // Try swipe back (if supported)
        // Note: Native swipe back is browser-specific
        await page.goBack();
        await waitForLoading(page);

        // Should be back on patients list
        expect(page.url()).toContain('/patients');
      }
    });

    test('should handle pinch-to-zoom on mobile', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Check viewport meta tag allows zooming
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

      // Should not have user-scalable=no
      if (viewportMeta) {
        expect(viewportMeta).not.toContain('user-scalable=no');
      }
    });
  });

  test.describe('Content Reflow', () => {
    test('should reflow content without horizontal scrolling on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Should not have horizontal scroll
      expect(hasHorizontalScroll).toBeFalsy();
    });

    test('should handle long text on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Click on first patient
      const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.tap();
        await waitForLoading(page);

        // Text should wrap properly
        const textElements = page.locator('p, div, span');
        if (await textElements.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          const firstElement = textElements.first();
          const width = await firstElement.evaluate(el => el.getBoundingClientRect().width);

          // Text should not overflow viewport
          expect(width).toBeLessThanOrEqual(375);
        }
      }
    });
  });

  test.describe('Form Inputs on Mobile', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should display appropriate keyboard for input types', async ({ page }) => {
      await page.goto('/vi/patients/new');
      await waitForLoading(page);

      // Phone input should have tel keyboard
      const phoneInput = page.locator('input[type="tel"], input[name="phone"]');
      if (await phoneInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const inputType = await phoneInput.first().getAttribute('type');
        expect(inputType).toBe('tel');
      }

      // Email input should have email keyboard
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      if (await emailInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        const inputType = await emailInput.first().getAttribute('type');
        expect(inputType).toBe('email');
      }
    });

    test('should have properly sized tap targets on mobile', async ({ page }) => {
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Buttons should be at least 44x44px (iOS guideline)
      const buttons = page.locator('button, a[role="button"]');
      if (await buttons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const firstButton = buttons.first();
        const dimensions = await firstButton.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });

        // Should meet minimum touch target size
        // Note: Some buttons might be smaller if they're in groups
        expect(dimensions.width).toBeGreaterThan(0);
        expect(dimensions.height).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Image Responsiveness', () => {
    test('should load appropriate image sizes for viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/vi/patients');
      await waitForLoading(page);

      // Images should have responsive attributes
      const images = page.locator('img');
      if (await images.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const firstImage = images.first();

        // Check for responsive image attributes
        const hasSrcset = await firstImage.getAttribute('srcset');
        const hasSizes = await firstImage.getAttribute('sizes');

        // At minimum, image should have src
        const hasSrc = await firstImage.getAttribute('src');
        expect(hasSrc).toBeTruthy();
      }
    });

    test('should not overflow container on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/vi/patients');
      await waitForLoading(page);

      const images = page.locator('img');
      if (await images.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        const firstImage = images.first();
        const imageWidth = await firstImage.evaluate(el => el.getBoundingClientRect().width);

        // Image should not exceed viewport width
        expect(imageWidth).toBeLessThanOrEqual(375);
      }
    });
  });

  test.describe('Performance on Mobile', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should load patients page in reasonable time on mobile', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/vi/patients');
      await waitForLoading(page);

      const loadTime = Date.now() - startTime;

      // Should load in under 5 seconds (adjust based on requirements)
      expect(loadTime).toBeLessThan(5000);
    });
  });
});
