import { expect, test, type Page } from '@playwright/test';
import { registerUser, verifyModelConnection } from './helpers/api';
import { signInUser } from './helpers/auth';

test('keeps one clear interview continuation and confirms restart', async ({ page }) => {
  test.setTimeout(120_000);
  const user = await registerUser('interview-continuation');
  await verifyModelConnection(user, 'e2e-interview-continuation-secret-9876');
  await signInUser(page, user);
  const starts = trackStartRequests(page);
  const firstSessionHref = await startFirstInterview(page);
  await continueFromHome(page, firstSessionHref);
  await restartWithConfirmation(page, firstSessionHref, starts);
});

function trackStartRequests(page: Page) {
  const starts = { count: 0 };
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/interviews/start')) {
      starts.count += 1;
    }
  });
  return starts;
}

async function startFirstInterview(page: Page) {
  await page.goto('/interview');
  await page.getByRole('button', { name: '开始模拟面试' }).click();
  await expect(page).toHaveURL(/\/interview\?session=/, { timeout: 30_000 });
  await expect(page.getByRole('region', { name: '本轮面试状态' })).toBeVisible();
  return currentPath(page);
}

async function continueFromHome(page: Page, firstSessionHref: string) {
  await page.goto('/home');
  const continuation = page.getByRole('link', { name: '继续上次面试' });
  /* 满并发下首页数据接口偶尔超过默认 5s，放宽到 20s 与其余档案断言一致。 */
  await expect(continuation).toHaveCount(1, { timeout: 20_000 });
  await expect(continuation).toHaveAttribute('href', firstSessionHref);
  await continuation.click();
  await expect(page).toHaveURL(firstSessionHref);
  await page.reload();
  await expect(page.getByRole('region', { name: '本轮面试状态' })).toBeVisible();
}

async function restartWithConfirmation(
  page: Page,
  firstSessionHref: string,
  starts: { count: number },
) {
  await page.setViewportSize({ width: 375, height: 812 });
  const restart = page.getByRole('button', { name: '重新开始本轮' });
  await expect(restart).toHaveAttribute('aria-haspopup', 'dialog');
  expect(
    await restart.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);

  await restart.click();
  await expect(page.getByRole('dialog', { name: '重新开始一场面试？' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保留本轮，继续回答' })).toBeFocused();
  expect(starts.count).toBe(1);
  await page.getByRole('button', { name: '保留本轮，继续回答' }).press('Escape');
  await expect(page.getByRole('dialog', { name: '重新开始一场面试？' })).toHaveCount(0);
  await expect(restart).toBeFocused();

  await restart.press('Enter');
  const dialog = page.getByRole('dialog', { name: '重新开始一场面试？' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '确认重新开始' }).click();
  await expect.poll(() => currentPath(page)).not.toBe(firstSessionHref);
  expect(starts.count).toBe(2);
  const secondSessionHref = currentPath(page);
  await page.reload();
  await expect(page).toHaveURL(secondSessionHref);
  await expect(page.getByRole('region', { name: '本轮面试状态' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

function currentPath(page: Page) {
  const url = new URL(page.url());
  return url.pathname + url.search;
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    })),
  ).toEqual({ clientWidth: 375, scrollWidth: 375 });
}
