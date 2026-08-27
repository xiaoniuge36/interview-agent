import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/api';
import { signInUser } from './helpers/auth';

import type { Page } from '@playwright/test';

const COURSE_TITLE = 'Agent 基础与上下文工程';
const PROGRESS_STORAGE_KEY = 'interview-agent:learning-progress:v1';

/** 打开学习中心并等初始云同步完成，避免后台回填与后续导航竞争。 */
async function openLearningCenterSettled(page: Page) {
  const initialSync = page.waitForResponse(
    (response) =>
      response.url().includes('/learning-progress') && response.request().method() === 'GET',
    { timeout: 20_000 },
  );
  await page.goto('/learn');
  await initialSync.catch(() => undefined);
}

test('keeps learning completion on the account after local storage is cleared', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const user = await registerUser('learning-progress');
  await signInUser(page, user);

  await openLearningCenterSettled(page);
  await page.getByLabel('学习资料目录').getByRole('link', { name: COURSE_TITLE }).click();
  // 并发压测下动态渲染排队，URL 在 RSC 响应完成后才提交，放宽等待。
  await expect(page).toHaveURL(/\/learn\?doc=/, { timeout: 20_000 });

  // 只认包含完成标记的那次写入：初始同步的 PUT 仅携带 lastOpenedSlug，不算数。
  const progressSaved = page.waitForResponse(
    (response) =>
      response.url().includes('/learning-progress') &&
      response.request().method() === 'PUT' &&
      response.ok() &&
      Boolean(response.request().postData()?.includes('"completedSlugs":["学习路线-01-')),
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: '标记本课已完成' }).click();
  await expect(page.getByRole('button', { name: '取消完成标记' })).toBeVisible();
  await progressSaved;

  // 云端同步生效：清空本地存储后刷新，完成状态应从账号进度恢复。
  await page.evaluate((key) => window.localStorage.removeItem(key), PROGRESS_STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole('button', { name: '取消完成标记' })).toBeVisible({
    timeout: 20_000,
  });
});

test('walks from a course into question bank verification and back', async ({ page }) => {
  test.setTimeout(90_000);
  const user = await registerUser('learning-verification');
  await signInUser(page, user);

  await openLearningCenterSettled(page);
  await page.getByLabel('学习资料目录').getByRole('link', { name: COURSE_TITLE }).click();

  const verifyLink = page.getByRole('link', { name: '进入题库验证 · ReAct' });
  await expect(verifyLink).toBeVisible({ timeout: 20_000 });
  await verifyLink.click();

  await expect(page).toHaveURL(/\/questions\?source=learn/, { timeout: 20_000 });
  await expect(page.getByText('本课客观题验证')).toBeVisible();
  await expect(page.getByText(COURSE_TITLE).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '查看 ReAct 客观题' })).toBeVisible();

  await page.getByRole('link', { name: /返回本课/ }).click();
  await expect(page).toHaveURL(/\/learn\?doc=/, { timeout: 20_000 });
  await expect(page.getByText('已返回本课，可继续查看学习资料。')).toBeVisible();
});
