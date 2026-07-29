import { expect, test, type Page } from '@playwright/test';
import {
  createPracticeFixture,
  registerUser,
  savePracticeAnswers,
  verifyModelConnection,
} from './helpers/api';
import { signInUser } from './helpers/auth';

test('keeps an authenticated user in the real practice to report loop', async ({ page }) => {
  test.setTimeout(90_000);
  const user = await registerUser('practice-success');
  await verifyModelConnection(user, 'e2e-success');
  const session = await createPracticeFixture(user);
  await savePracticeAnswers(user, session);

  await signInUser(page, user);
  const continueTraining = page.getByRole('link', { name: '继续训练', exact: true });
  await expect(continueTraining).toHaveCount(1);
  await expect(page.getByRole('button', { name: '采用这组题开始练习' })).toHaveCount(0);
  await continueTraining.click();
  await expect(page).toHaveURL(`/practice?session=${session.id}`);
  await expect(page.locator('.practice-player-page')).toBeVisible();
  await verifyMobileDraftNavigation(page);

  await requestAiEvaluation(page);
  await expect(page.locator('.practice-evaluation-result')).toContainText('异常处理');

  await page.locator('.practice-round-completion-step button:not(.secondary)').click();
  await confirmAiOperation(page);
  await expect(page.locator('.practice-completion-page')).toBeVisible();
  await expect(page.getByText('逐题回顾', { exact: true })).toBeVisible();
  const evaluations = page.locator('.practice-report-evaluation');
  await expect(evaluations).toHaveCount(session.items.length);
  await expect(evaluations.first()).toContainText('异常恢复');
  await expect(page.getByLabel('本轮训练证据')).toBeVisible();
  await expect(page.getByRole('button', { name: '复练薄弱项' })).toBeVisible();
  await expect(page.getByRole('link', { name: '用模拟面试检验本轮提升' })).toBeVisible();

  await page.goto('/questions');
  await expect(page.getByLabel('推荐依据').first()).toBeVisible();
  await page.getByRole('button', { name: '采用并开始训练' }).click();
  await expect(page).toHaveURL(/\/practice\?session=/);
  await expect(page.locator('.practice-player-page')).toBeVisible();

  await page.goto('/reports');
  const mistake = page.locator('.mistake-book-row').first();
  await expect(mistake).toBeVisible();
  await expect(mistake.getByLabel('推荐依据')).toBeVisible();
  await mistake.getByRole('button', { name: '开始这题复练' }).click();
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
  await requestAiEvaluation(page);

  await expect(page.locator('.practice-coach-issue[role=alert]')).toBeVisible();
  await page.locator('.practice-feedback-header > button').click();
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

async function verifyMobileDraftNavigation(page: Page) {
  await page.setViewportSize({ width: 375, height: 812 });
  const answer = page.locator('.practice-answer-editor textarea');
  const savedAnswer = await answer.inputValue();
  const localDraft = `${savedAnswer} 这是未保存的移动端补充。`;
  await answer.fill(localDraft);
  await page.getByRole('button', { name: '2 已保存' }).click();

  const dialog = page.getByRole('dialog', { name: '保留这段草稿再切换？' });
  const stay = dialog.getByRole('button', { name: '留在本题' });
  const continueWithDraft = dialog.getByRole('button', { name: '保留草稿并切换' });
  await expect(stay).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(continueWithDraft).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(answer).toHaveValue(localDraft);

  await page.getByRole('button', { name: '2 已保存' }).click();
  await expect(dialog).toBeVisible();
  await stay.click();
  await expect(dialog).toBeHidden();
  await expect(answer).toHaveValue(localDraft);

  await page.getByRole('button', { name: '2 已保存' }).click();
  await expect(dialog).toBeVisible();
  await continueWithDraft.click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: '1 已保存' }).click();
  await expect(answer).toHaveValue(localDraft);
  await page.reload();
  await expect(page.locator('.practice-player-page')).toBeVisible();
  await expect(answer).toHaveValue(localDraft);
  await answer.fill(savedAnswer);

  const pageWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageWidth).toEqual({ clientWidth: 375, scrollWidth: 375 });
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function requestAiEvaluation(page: Page) {
  await page.locator('.practice-feedback-launcher button').click();
  await page.locator('.practice-ai-ready button').click();
  await confirmAiOperation(page);
}

async function confirmAiOperation(page: Page) {
  const dialog = page.locator('.practice-ai-confirmation-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('footer button:not(.secondary)').click();
}
