import { expect, type Page } from '@playwright/test';
import { E2E } from './db';

export async function login(page: Page, password: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** On /me: pick the student and set (first time) or enter the PIN. */
export async function identify(page: Page, name: string, pin = E2E.pin) {
  await page.getByLabel('Я —').selectOption({ label: name });
  const setting = page.getByLabel('Придумайте PIN');
  if (await setting.isVisible()) {
    await setting.fill(pin);
    await page.getByLabel('Повторите PIN').fill(pin);
    await page.getByRole('button', { name: 'Задать PIN и продолжить' }).click();
  } else {
    await page.getByLabel('PIN', { exact: true }).fill(pin);
    await page.getByRole('button', { name: 'Подтвердить' }).click();
  }
}

export async function submitSolution(page: Page, taskId: number, code: string) {
  await page.goto(`/submit/solution?task=${taskId}`);
  await expect(page.getByLabel('Задача')).toHaveValue(String(taskId));
  await page.getByLabel('Код на Python').fill(code);
  await page.getByRole('button', { name: 'Отправить на проверку' }).click();
}
