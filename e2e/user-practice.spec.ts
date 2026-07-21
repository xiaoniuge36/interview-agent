import { expect, test, type Page } from '@playwright/test';
import {
  createPracticeFixture,
  registerUser,
  savePracticeAnswers,
  verifyModelConnection,
} from './helpers/api';
import { signInUser } from './helpers/auth';

test('keeps an authenticated user in the real practice to report loop', async ({ page }) => {
  const user = await registerUser('practice-success');
  await verifyModelConnection(user, 'e2e-success');
  const session = await createPracticeFixture(user);
  await savePracticeAnswers(user, session);

  await signInUser(page, user);
  await page.goto(`/practice?session=${session.id}`);
  await expect(page.locator('.practice-player-page')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.practice-ai-ready button').click();
  await expect(page.locator('.practice-evaluation-result')).toContainText('异常处理');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '生成 AI 复盘' }).click();
  await expect(page.locator('.practice-completion-page')).toBeVisible();
  await expect(page.getByText('逐题回顾', { exact: true })).toBeVisible();
  const evaluations = page.locator('.practice-report-evaluation');
  await expect(evaluations).toHaveCount(session.items.length);
  await expect(evaluations.first()).toContainText('异常恢复');
  await page.getByRole('button', { name: '按最新推荐开始下一轮' }).click();
  await expect(page).toHaveURL(/\/practice\?session=/);
  await expect(page.locator('.practice-player-page')).toBeVisible();
});

test('shows a traditional error and keeps saved answers when the model is invalid', async ({
  page,
}) => {
  const user = await registerUser('practice-invalid-model');
  await verifyModelConnection(user, 'e2e-invalid-json');
  const session = await createPracticeFixture(user);
  await savePracticeAnswers(user, session);

  await signInUser(page, user);
  await page.goto(`/practice?session=${session.id}`);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.practice-ai-ready button').click();

  await expect(page.locator('.practice-coach-issue[role=alert]')).toBeVisible();
  await expect(page.locator('.practice-answer-editor textarea')).toHaveValue(
    '我会说明背景、决策、结果和复盘。',
  );
});

test('returns to the login page after its local session is cleared', async ({ page }) => {
  const user = await registerUser('expired-local-session');

  await signInUser(page, user);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();

  await expect(page.locator('#access-email')).toBeVisible();
});

test('keeps a model-backed coach conversation after the user refreshes the page', async ({
  page,
}) => {
  const user = await registerUser('user-agent-conversation');
  const modelKey = 'e2e-user-agent-secret-9876';
  const question = '请根据我的薄弱项安排今天的训练。';
  await verifyModelConnection(user, modelKey);

  await signInUser(page, user);
  await openCoach(page);
  const composer = page.getByLabel('向 AI 刷题教练提问');
  await expect(composer).toBeEnabled();
  await composer.fill(question);
  await page.getByRole('button', { name: '发送' }).click();
  await expect(page.locator('.user-agent-message.is-user')).toContainText(question);
  await expect(page.locator('.user-agent-message.is-assistant')).toContainText(
    '这是固定的训练建议：',
  );

  await page.reload();
  await openCoach(page);
  await expect(page.locator('.user-agent-message.is-user')).toContainText(question);
  await expect(page.locator('.user-agent-message.is-assistant')).toContainText(
    '这是固定的训练建议：',
  );
  await expect(page.locator('html')).not.toContainText(modelKey);
});

async function openCoach(page: Page) {
  await page.getByRole('button', { name: '打开 AI 刷题教练' }).click();
  await expect(page.getByRole('dialog', { name: 'AI 刷题教练' })).toBeVisible();
}
