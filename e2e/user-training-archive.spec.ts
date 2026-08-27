import { expect, test } from '@playwright/test';
import { createPracticeFixture, registerUser, savePracticeAnswers } from './helpers/api';
import { signInUser } from './helpers/auth';

test('switches archive sections and keeps filter feedback visible', async ({ page }) => {
  test.setTimeout(90_000);
  const user = await registerUser('archive-sections');
  const session = await createPracticeFixture(user);
  await savePracticeAnswers(user, session);

  await signInUser(page, user);
  await page.goto('/reports');

  const recordsTab = page.getByRole('button', { name: /训练记录/ });
  const mistakesTab = page.getByRole('button', { name: /错题本/ });
  await expect(recordsTab).toHaveAttribute('aria-pressed', 'true');
  await expect(mistakesTab).toHaveAttribute('aria-pressed', 'false');

  const recordList = page.getByLabel('训练记录列表');
  await expect(recordList).toBeVisible();
  await expect(recordList.getByText('E2E 智能训练')).toBeVisible();

  await page.getByRole('button', { name: /^模拟面试/ }).click();
  await expect(recordList).toBeHidden();
  await expect(page.getByText('还没有模拟面试记录。开始一场面试，让反馈沉淀下来。')).toBeVisible();

  await page.getByRole('button', { name: /^刷题复盘/ }).click();
  await expect(recordList.getByText('E2E 智能训练')).toBeVisible();

  await mistakesTab.click();
  await expect(mistakesTab).toHaveAttribute('aria-pressed', 'true');
  await expect(recordList).toBeHidden();
  await expect(page.locator('#mistake-book-heading')).toBeVisible();

  await recordsTab.click();
  await expect(recordList).toBeVisible();
});

test('opens the mistake book section directly from its deep link', async ({ page }) => {
  const user = await registerUser('archive-deep-link');
  await signInUser(page, user);

  await page.goto('/reports#mistake-book-heading');

  await expect(page.getByRole('button', { name: /错题本/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('#mistake-book-heading')).toBeVisible();
  await expect(page.getByLabel('训练记录列表')).toBeHidden();
});
