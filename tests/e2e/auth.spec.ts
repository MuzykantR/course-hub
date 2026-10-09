import { expect, test } from '@playwright/test';
import { passwords, resetRateLimits } from './db';
import { login } from './helpers';

test.beforeEach(async () => {
  await resetRateLimits();
});

test('without a session every page redirects to /login and keeps the target', async ({ page }) => {
  for (const path of ['/', '/kb', '/admin', '/me', '/submit/solution', '/reliability']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  await page.goto('/admin/moderation');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fmoderation/);
});

test('the health check is public, uncached and returns no data', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('no-store');
  expect(await res.json()).toEqual({ ok: true });
});

test('a wrong password shows an error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Пароль').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveText('Неверный пароль');
});

test('a student cannot open the admin area', async ({ page }) => {
  await login(page, passwords().course);
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await page.goto('/admin/moderation');
  await expect(page).toHaveURL('/');
});

test('the teacher lands in the admin area', async ({ page }) => {
  await login(page, passwords().teacher);
  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('heading', { name: 'Панель преподавателя' })).toBeVisible();
});

test('?next= cannot redirect to another site', async ({ page }) => {
  await login(page, passwords().course, '//evil.example/steal');
  expect(new URL(page.url()).host).toBe('localhost:3000');
  await expect(page).toHaveURL('/');
});

test('logout ends the session', async ({ page }) => {
  await login(page, passwords().course);
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/kb');
  await expect(page).toHaveURL(/\/login/);
});
