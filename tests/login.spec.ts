// Local run requires .env.test.local with:
//   TEST_STAFF_EMAIL, TEST_STAFF_PASSWORD,
//   WP_API_URL, WP_API_USER, WP_API_PASSWORD,
//   NEXTAUTH_SECRET, NEXTAUTH_URL
//
// In CI those values are injected by .github/workflows/e2e-login.yml.
//
// The login flow: /login -> router.push('/kiosk') -> server-side
// redirect('/attendance'). Browser settles on /attendance, so we
// wait for that URL and then assert the data-fetched columns are
// visible — proving the WP backend round-trip succeeded.

import { test, expect } from '@playwright/test';

const email = process.env.TEST_STAFF_EMAIL;
const password = process.env.TEST_STAFF_PASSWORD;

if (!email) throw new Error('Missing required env var TEST_STAFF_EMAIL');
if (!password) throw new Error('Missing required env var TEST_STAFF_PASSWORD');

test('staff can log in and reach attendance with data loaded', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL('**/attendance', { timeout: 10_000 });

  await expect(page.getByTestId('attendance-columns')).toBeVisible({ timeout: 15_000 });
});
