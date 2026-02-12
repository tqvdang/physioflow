import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:7014';
const AUTH_FILE = path.join(__dirname, '.auth/user.json');

/**
 * Global setup: Authenticate once and save state for all tests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Ensure auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    // Navigate to the app (will redirect to Keycloak)
    await page.goto(baseURL + '/vi');

    // Wait for redirect to Keycloak or check if already logged in
    await page.waitForLoadState('networkidle');

    // Check if we need to log in
    if (page.url().includes('localhost:7014') || page.url().includes('keycloak')) {
      console.log('Logging in via Keycloak...');

      // Fill in Keycloak login form
      // Use homelab credentials: therapist@physioflow.local / Therapist@123
      const username = baseURL?.includes('trancloud.work') ? 'therapist@physioflow.local' : 'therapist1';
      const password = 'Therapist@123';

      console.log(`Logging in as ${username}...`);
      await page.fill('#username', username);
      await page.fill('#password', password);
      await page.click('#kc-login');

      // Wait for redirect back to app (may go to /dashboard or /vi/*)
      const urlPattern = baseURL?.includes('trancloud.work')
        ? /physioflow-dev\.trancloud\.work\/(vi|en|dashboard)/
        : /localhost:7010\/(vi|en|dashboard)/;
      await page.waitForURL(urlPattern, { timeout: 30000 });
      console.log('Login successful, redirected to:', page.url());
    }

    // Save authentication state
    await context.storageState({ path: AUTH_FILE });
    console.log('Auth state saved to:', AUTH_FILE);
  } catch (error) {
    console.error('Global setup failed:', error);
    // Save a screenshot for debugging
    await page.screenshot({ path: 'setup-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
