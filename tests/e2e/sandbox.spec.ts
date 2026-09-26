import { expect, test } from '@playwright/test';
import { passwords, resetRateLimits, taskId } from './db';
import { login } from './helpers';

test.describe('Python sandbox', () => {
  test.beforeEach(async ({ page }) => {
    await resetRateLimits();
    await login(page, passwords().course);
    await page.goto(`/tasks/${await taskId()}`);
  });

  test('runs code against the task tests', async ({ page }) => {
    await page.getByLabel('Код на Python').fill('def add(a, b):\n    return a + b\nprint("hi")');
    await page.getByRole('button', { name: 'Запустить и проверить' }).click();
    // First run downloads Pyodide from the CDN.
    await expect(page.getByText('Тесты: 1 из 1')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('pre', { hasText: 'hi' })).toBeVisible();
  });

  test('stops an infinite loop and recovers', async ({ page }) => {
    const code = page.getByLabel('Код на Python');
    await code.fill('while True:\n    pass');
    await page.getByRole('button', { name: 'Запустить и проверить' }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('Время вышло', { timeout: 80_000 });

    await code.fill('def add(a, b):\n    return a + b');
    await page.getByRole('button', { name: 'Запустить и проверить' }).click();
    await expect(page.getByText('Тесты: 1 из 1')).toBeVisible({ timeout: 60_000 });
  });

  test('user code cannot reach the network', async ({ page }) => {
    await page
      .getByLabel('Код на Python')
      .fill(
        'import js\ntry:\n    js.fetch("/me")\n    print("LEAK")\nexcept Exception as e:\n    print("blocked")',
      );
    await page.getByRole('button', { name: 'Запустить и проверить' }).click();
    await expect(page.locator('pre', { hasText: 'blocked' })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('pre', { hasText: 'LEAK' })).toHaveCount(0);
  });
});
