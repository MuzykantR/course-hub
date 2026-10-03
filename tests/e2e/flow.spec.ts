import { expect, test, type Browser, type Page } from '@playwright/test';
import { db, E2E, passwords, resetRateLimits, taskId } from './db';
import { identify, login, submitSolution } from './helpers';

// One student goes from PIN binding to a published solution; the teacher moderates.
test.describe.serial('submission → moderation → publication', () => {
  let student: Page;
  let task: number;

  test.beforeAll(async ({ browser }) => {
    task = await taskId();
    student = await (await browser.newContext()).newPage();
  });

  test.afterAll(async () => {
    await student.context().close();
  });

  test('unidentified student is sent to /me and brought back after setting a PIN', async () => {
    await login(student, passwords().course, `/submit/solution?task=${task}`);
    await expect(student).toHaveURL(/\/me\?next=/);
    await identify(student, E2E.studentA);
    await expect(student).toHaveURL(`/submit/solution?task=${task}`);
    await expect(student.getByLabel('Задача')).toHaveValue(String(task));
  });

  test('a solution is submitted and shows up as pending', async () => {
    await submitSolution(student, task, 'def add(a, b):\n    return a + b\n');
    await expect(student).toHaveURL('/me?sent=solution');
    await expect(student.getByRole('status')).toContainText('Заявка отправлена');
    await expect(student.locator('main li', { hasText: E2E.taskTitle })).toContainText(
      'На модерации',
    );
  });

  test('a second submission within a minute is refused', async () => {
    await submitSolution(student, task, 'def add(a, b):\n    return sum((a, b))\n');
    await expect(student.locator('main').getByRole('alert')).toContainText('нужна минута');
  });

  test('the exact same code is refused as a duplicate', async () => {
    await resetRateLimits();
    await submitSolution(student, task, 'def add(a, b):\n    return a + b\n');
    await expect(student.locator('main').getByRole('alert')).toContainText('уже отправляли');
  });

  test('a bot filling the honeypot gets a fake success and nothing is stored', async () => {
    await resetRateLimits();
    await student.goto(`/submit/solution?task=${task}`);
    await student.getByLabel('Код на Python').fill('print("spam")');
    await student.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
      el.value = 'http://spam.example';
    });
    await student.getByRole('button', { name: 'Отправить на проверку' }).click();
    await expect(student).toHaveURL('/me?sent=1');
    const { count } = await db()
      .from('solutions')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', task)
      .like('code', '%spam%');
    expect(count).toBe(0);
  });

  test('the fourth pending submission is blocked by the queue limit', async () => {
    for (const code of ['def add(a, b):\n    return b + a\n', 'add = lambda a, b: a + b\n']) {
      await resetRateLimits();
      await submitSolution(student, task, code);
      await expect(student).toHaveURL('/me?sent=solution');
    }
    await resetRateLimits();
    await student.goto('/submit/solution');
    await expect(student.getByText('У вас уже 3 заявки на проверке')).toBeVisible();
    await expect(student.getByRole('button', { name: 'Отправить на проверку' })).toHaveCount(0);
  });

  test('the teacher approves one solution and rejects another with a comment', async ({
    browser,
  }) => {
    const teacher = await teacherPage(browser);
    await teacher.goto('/admin/moderation');
    const items = teacher.locator('article', { hasText: E2E.taskTitle });
    await expect(items).toHaveCount(3);

    // Approve the first (oldest) one, marking it as solved at the board.
    const first = items.first();
    await first.getByLabel('Разобрано на паре').check();
    await first.getByRole('button', { name: 'Одобрить' }).click();
    await expect(items).toHaveCount(2);

    // Rejecting requires a comment.
    const next = items.first();
    await next.getByRole('button', { name: 'Отклонить' }).click();
    await expect(next.getByRole('alert')).toContainText('почему отклонено');
    await next.getByPlaceholder(/Комментарий/).fill('Используйте обычную функцию, не lambda.');
    await next.getByRole('button', { name: 'Отклонить' }).click();
    await expect(items).toHaveCount(1);
    await teacher.context().close();
  });

  test('the approved solution is public and the student sees the teacher comment', async () => {
    await student.goto(`/tasks/${task}`);
    const solution = student.locator('article', { hasText: E2E.studentA });
    await expect(solution).toContainText('Разобрано на паре');
    await expect(solution).toContainText('return a + b');

    await student.goto('/me');
    await expect(student.locator('main li', { hasText: 'Отклонено' })).toContainText(
      'Используйте обычную функцию',
    );

    await student.goto('/kb?q=E2E');
    await expect(student.getByRole('link', { name: E2E.taskTitle })).toBeVisible();
  });
});

async function teacherPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await login(page, passwords().teacher);
  return page;
}
