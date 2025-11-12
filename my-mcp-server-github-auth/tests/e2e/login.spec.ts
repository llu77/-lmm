import { test, expect } from '@playwright/test';
test('login smoke', async ({ page }) => {
  const msgs = [];
  page.on('console', m => msgs.push(m.text()));
  await page.goto('/login', { waitUntil: 'networkidle' });
  await expect(page.locator('form#login, form[data-test="login-form"]')).toBeVisible();
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASS || 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
  expect(msgs.find(m => /defaultMutationOptions|Uncaught TypeError/.test(m))).toBeFalsy();
});
