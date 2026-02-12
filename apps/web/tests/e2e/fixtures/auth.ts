import { test as base, expect, Page } from '@playwright/test';

/**
 * Test user credentials
 * Note: Default password for all test users is "password" (see Makefile urls target)
 */
export const TEST_USERS = {
  therapist: {
    username: 'therapist1',
    password: 'password',
    role: 'therapist',
  },
  admin: {
    username: 'admin',
    password: 'password',
    role: 'super_admin',
  },
  assistant: {
    username: 'assistant1',
    password: 'password',
    role: 'assistant',
  },
  frontDesk: {
    username: 'frontdesk1',
    password: 'password',
    role: 'front_desk',
  },
} as const;

export type TestUserType = keyof typeof TEST_USERS;

/**
 * Login via Keycloak OAuth flow
 */
export async function loginViaKeycloak(
  page: Page,
  user: TestUserType = 'therapist'
): Promise<void> {
  const { username, password } = TEST_USERS[user];

  // Navigate to app to trigger OAuth
  await page.goto('/vi');
  await page.waitForLoadState('networkidle');

  // If redirected to Keycloak, fill login form
  if (page.url().includes('localhost:7014') || page.url().includes('keycloak')) {
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('#kc-login');
    await page.waitForURL('**/vi/**', { timeout: 30000 });
  }
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu and logout
  await page.click('[data-testid="user-menu"]').catch(() => {
    // Try alternative selector if data-testid not found
    page.click('button:has-text("Logout")');
  });
  await page.click('text=Logout').catch(() => {});
  await page.waitForLoadState('networkidle');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for presence of auth token in localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('auth_token') || localStorage.getItem('access_token');
  });
  return !!token;
}

/**
 * Extended test fixture with auth helpers
 */
export const test = base.extend<{
  loginAs: (user: TestUserType) => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    const loginAs = async (user: TestUserType) => {
      await loginViaKeycloak(page, user);
    };
    await use(loginAs);
  },
});

export { expect };
