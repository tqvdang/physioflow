import { Page, expect, Locator } from '@playwright/test';

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: options?.timeout || 10000 }
  );
}

/**
 * Fill a form field by label
 */
export async function fillByLabel(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const field = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") + textarea`);
  await field.fill(value);
}

/**
 * Select option from dropdown by label
 */
export async function selectByLabel(
  page: Page,
  label: string,
  option: string
): Promise<void> {
  await page.locator(`label:has-text("${label}")`).click();
  await page.locator(`[role="option"]:has-text("${option}")`).click();
}

/**
 * Assert toast notification appears
 */
export async function expectToast(
  page: Page,
  message: string | RegExp,
  type?: 'success' | 'error' | 'warning' | 'info'
): Promise<void> {
  const toastSelector = type
    ? `[role="alert"][data-type="${type}"], .toast.${type}`
    : '[role="alert"], .toast';

  const toast = page.locator(toastSelector);
  await expect(toast).toContainText(message);
}

/**
 * Wait for loading to complete with timeout
 */
export async function waitForLoading(page: Page, timeout = 10000): Promise<void> {
  // Wait for any loading indicators to disappear
  await page.waitForSelector('[data-loading="true"]', { state: 'hidden', timeout }).catch(() => {});
  await page.waitForSelector('.loading, .spinner', { state: 'hidden', timeout }).catch(() => {});
  // Use domcontentloaded instead of networkidle to avoid hanging on API retries
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  // Brief wait for any initial renders
  await page.waitForTimeout(1000);
}

/**
 * Navigate to page and wait for load
 */
export async function navigateTo(
  page: Page,
  path: string,
  locale: 'vi' | 'en' = 'vi'
): Promise<void> {
  const fullPath = path.startsWith('/') ? `/${locale}${path}` : `/${locale}/${path}`;
  await page.goto(fullPath);
  await waitForLoading(page);
}

/**
 * Get table row by content
 */
export function getTableRow(page: Page, content: string): Locator {
  return page.locator(`tr:has-text("${content}")`);
}

/**
 * Click button with text
 */
export async function clickButton(page: Page, text: string): Promise<void> {
  await page.locator(`button:has-text("${text}")`).click();
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    patientName: `Test Patient ${timestamp}`,
    patientNameVi: `Bệnh nhân thử ${timestamp}`,
    phone: `0${Math.floor(100000000 + Math.random() * 900000000)}`,
    email: `test${timestamp}@example.com`,
  };
}

/**
 * Format date for input fields
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date formatted
 */
export function getToday(): string {
  return formatDateForInput(new Date());
}

/**
 * Get date offset from today
 */
export function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
}
