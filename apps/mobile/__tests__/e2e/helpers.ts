import { device, element, by, waitFor } from 'detox';

/**
 * Helper functions for E2E tests
 */

/**
 * Login with test credentials
 */
export async function login(
  email: string = 'therapist1@physioflow.local',
  password: string = 'Therapist@123'
): Promise<void> {
  await waitFor(element(by.id('email-input')))
    .toBeVisible()
    .withTimeout(5000);

  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('login-button')).tap();

  await waitFor(element(by.id('patient-list')))
    .toBeVisible()
    .withTimeout(5000);
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await element(by.id('settings-tab')).tap();
  await element(by.id('logout-button')).tap();
  await element(by.text('Logout')).tap(); // Confirm

  await waitFor(element(by.id('login-button')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Go offline
 */
export async function goOffline(): Promise<void> {
  await device.setURLBlacklist(['*']);
}

/**
 * Go online
 */
export async function goOnline(): Promise<void> {
  await device.setURLBlacklist([]);
}

/**
 * Trigger sync
 */
export async function triggerSync(): Promise<void> {
  await element(by.id('sync-button')).tap();
}

/**
 * Wait for sync to complete
 */
export async function waitForSyncComplete(timeout: number = 10000): Promise<void> {
  await waitFor(element(by.id('synced-badge')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Navigate to patient detail
 */
export async function navigateToPatient(patientIndex: number = 0): Promise<void> {
  await element(by.id('patient-list')).tap();
  await waitFor(element(by.id(`patient-item-${patientIndex}`)))
    .toBeVisible()
    .withTimeout(3000);
  await element(by.id(`patient-item-${patientIndex}`)).tap();
}

/**
 * Clear all app data (reset to fresh state)
 */
export async function clearAppData(): Promise<void> {
  await device.launchApp({ delete: true });
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  matcher: Detox.NativeMatcher,
  timeout: number = 5000
): Promise<void> {
  await waitFor(element(matcher))
    .not.toBeVisible()
    .withTimeout(timeout);
}

/**
 * Scroll to element
 */
export async function scrollToElement(
  scrollViewId: string,
  elementMatcher: Detox.NativeMatcher,
  direction: 'up' | 'down' = 'down'
): Promise<void> {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .whileElement(by.id(scrollViewId))
    .scroll(200, direction);
}

/**
 * Type text slowly (for better reliability)
 */
export async function typeTextSlowly(
  elementId: string,
  text: string
): Promise<void> {
  await element(by.id(elementId)).tap();
  await element(by.id(elementId)).typeText(text);
}

/**
 * Clear text field
 */
export async function clearTextField(elementId: string): Promise<void> {
  await element(by.id(elementId)).tap();
  await element(by.id(elementId)).clearText();
}

/**
 * Take screenshot
 */
export async function takeScreenshot(name: string): Promise<void> {
  await device.takeScreenshot(name);
}

/**
 * Verify offline indicator is shown
 */
export async function verifyOfflineIndicator(): Promise<void> {
  await waitFor(element(by.id('offline-indicator')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Verify unsynced badge is shown
 */
export async function verifyUnsyncedBadge(): Promise<void> {
  await waitFor(element(by.id('unsynced-badge')))
    .toBeVisible()
    .withTimeout(2000);
}

/**
 * Get pending sync count
 */
export async function getPendingSyncCount(): Promise<void> {
  await element(by.id('settings-tab')).tap();
  await waitFor(element(by.id('pending-sync-count')))
    .toBeVisible()
    .withTimeout(2000);
}

/**
 * Simulate slow network
 */
export async function simulateSlowNetwork(): Promise<void> {
  // Note: Detox doesn't have direct network throttling
  // This would need to be implemented via a proxy or mock server
  // For now, just add a delay simulation
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Wait for loading indicator to disappear
 */
export async function waitForLoading(): Promise<void> {
  await waitFor(element(by.id('loading-indicator')))
    .not.toBeVisible()
    .withTimeout(10000);
}

/**
 * Verify sync conflict modal
 */
export async function verifySyncConflictModal(): Promise<void> {
  await waitFor(element(by.id('conflict-modal')))
    .toBeVisible()
    .withTimeout(5000);
}

/**
 * Resolve sync conflict (choose server or client)
 */
export async function resolveSyncConflict(choice: 'server' | 'client'): Promise<void> {
  await verifySyncConflictModal();

  if (choice === 'server') {
    await element(by.id('use-server-button')).tap();
  } else {
    await element(by.id('use-client-button')).tap();
  }

  await waitForElementToDisappear(by.id('conflict-modal'));
}
