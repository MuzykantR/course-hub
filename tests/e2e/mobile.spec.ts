import { expect, test } from '@playwright/test';
import { passwords, resetRateLimits, taskId } from './db';
import { login } from './helpers';

// Runs only in the "mobile" project (Pixel 7 viewport).
test('student pages have no horizontal scroll on a phone', async ({ page }) => {
  await resetRateLimits();
  await login(page, passwords().course);
  for (const path of [
    '/',
    '/kb',
    '/lessons',
    `/tasks/${await taskId()}`,
    '/groups',
    '/me',
    '/reliability',
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});
