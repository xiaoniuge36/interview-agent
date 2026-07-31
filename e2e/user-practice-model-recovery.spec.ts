import { expect, test, type Page } from '@playwright/test';
import { createPracticeFixture, registerUser, savePracticeAnswers } from './helpers/api';
import { signInUser } from './helpers/auth';

const SAVED_ANSWER = '我会说明背景、决策、结果和复盘。';
const LOCAL_DRAFT = `${SAVED_ANSWER}未保存草稿需要恢复。`;

test('recovers the same practice after connecting a model in Settings', async ({ page }) => {
  test.setTimeout(120_000);
  const browserIssues = monitorBrowserIssues(page);
  const user = await registerUser('practice-model-recovery');
  const session = await createPracticeFixture(user);
  const practiceHref = `/practice?session=${session.id}`;
  const settingsHref = `/settings?returnTo=${encodeURIComponent(practiceHref)}`;
  await savePracticeAnswers(user, session);
  await signInUser(page, user);
  await page.goto(practiceHref);

  await preserveDraftAndOpenSecondQuestion(page);
  await openFeedback(page);
  await requestEvaluation(page);
  const recoveryLink = page.getByRole('link', { name: '连接并测试模型 →' });
  await expect(recoveryLink).toHaveAttribute('href', settingsHref);

  await page.setViewportSize({ width: 375, height: 812 });
  expect(await hitTargetHeight(recoveryLink)).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
  await recoveryLink.click();
  await expect(page).toHaveURL(settingsHref, { timeout: 20_000 });
  await createAndVerifyModel(page);

  const returnLink = page.getByRole('link', { name: '返回本轮练习' });
  await expect(returnLink).toHaveAttribute('href', practiceHref);
  await expect(page.getByText('默认模型已就绪，可以返回本轮练习继续评价。')).toBeVisible();
  expect(await hitTargetHeight(returnLink)).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await expect(page.getByRole('link', { name: '返回本轮练习' })).toBeVisible();
  await verifyNewTabAndFallback({ page, user, settingsHref, practiceHref, browserIssues });
  await returnToPracticeWithKeyboard(page, practiceHref);

  await expect(page.getByRole('heading', { name: '如何为高风险发布建立质量保障？' })).toBeVisible();
  await expect(page.getByText('已恢复当前标签页内未保存的回答。')).toBeVisible();
  await verifyLocalDraft(page);
  await returnToSecondQuestion(page);
  await openFeedback(page);
  await requestEvaluation(page);
  await expect(page.locator('.practice-evaluation-result')).toContainText('异常恢复');

  await page.reload();
  await expect(page.getByRole('button', { name: '2 已评价' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '如何为高风险发布建立质量保障？' })).toBeVisible();
  await verifyLocalDraft(page);
  await expectNoHorizontalOverflow(page);
  expect(browserIssues.consoleErrors).toEqual([]);
  expect(browserIssues.serverErrors).toEqual([]);
});

async function preserveDraftAndOpenSecondQuestion(page: Page) {
  const answer = page.locator('.practice-answer-editor textarea');
  await expect(answer).toHaveValue(SAVED_ANSWER);
  await answer.fill(LOCAL_DRAFT);
  await page.getByRole('button', { name: '2 已保存' }).click();
  const dialog = page.getByRole('dialog', { name: '保留这段草稿再切换？' });
  await expect(dialog.getByRole('button', { name: '留在本题' })).toBeFocused();
  await dialog.getByRole('button', { name: '保留草稿并切换' }).click();
}

async function createAndVerifyModel(page: Page) {
  await page.getByRole('button', { name: '连接第一个模型' }).click();
  await page.getByRole('combobox', { name: 'Provider' }).selectOption('openai_compatible');
  await page.getByLabel('模型名称').fill('e2e-model');
  await page.getByLabel('Base URL（仅自定义端点必填）').fill('https://model.e2e.test/v1');
  await page.getByLabel('API Key').fill('e2e-model-recovery-secret-9876');
  await page.getByRole('button', { name: '加密保存连接' }).click();
  await page.getByRole('button', { name: '◌ 测试连接' }).click();
  await expect(page.getByRole('link', { name: '返回本轮练习' })).toBeVisible();
}

async function verifyNewTabAndFallback(options: {
  page: Page;
  user: Awaited<ReturnType<typeof registerUser>>;
  settingsHref: string;
  practiceHref: string;
  browserIssues: ReturnType<typeof monitorBrowserIssues>;
}) {
  const { page, user, settingsHref, practiceHref, browserIssues } = options;
  const settingsPage = await page.context().newPage();
  monitorBrowserIssues(settingsPage, browserIssues);
  await settingsPage.goto(settingsHref);
  await settingsPage.getByLabel('邮箱').fill(user.email);
  await settingsPage.getByLabel('密码').fill(user.password);
  await settingsPage.getByRole('button', { name: '登录' }).click();
  await expect(settingsPage.getByRole('link', { name: '返回本轮练习' })).toHaveAttribute(
    'href',
    practiceHref,
  );

  await settingsPage.goto(
    '/settings?returnTo=https%3A%2F%2Fevil.example%2Fpractice%3Fsession%3Dattack',
  );
  await expect(settingsPage.getByRole('link', { name: '返回题库继续组卷' })).toHaveAttribute(
    'href',
    '/questions',
  );
  await settingsPage.goto('/settings');
  await expect(settingsPage.getByRole('link', { name: '返回题库继续组卷' })).toBeVisible();
  await settingsPage.close();
}

async function returnToPracticeWithKeyboard(page: Page, practiceHref: string) {
  const link = page.getByRole('link', { name: '返回本轮练习' });
  await link.focus();
  await expect(link).toBeFocused();
  await link.press('Enter');
  await expect(page).toHaveURL(practiceHref);
}

async function verifyLocalDraft(page: Page) {
  await page.getByRole('button', { name: '1 已保存' }).click();
  await expect(page.locator('.practice-answer-editor textarea')).toHaveValue(LOCAL_DRAFT);
}

async function returnToSecondQuestion(page: Page) {
  await page.getByRole('button', { name: /2 (已保存|已评价)/ }).click();
  await page
    .getByRole('dialog', { name: '保留这段草稿再切换？' })
    .getByRole('button', { name: '保留草稿并切换' })
    .click();
}

async function openFeedback(page: Page) {
  await page.getByRole('button', { name: /进入宽版解析|查看本题评价/ }).click();
}

async function requestEvaluation(page: Page) {
  await page.getByRole('button', { name: '生成本题 AI 评分' }).click();
  await page.getByRole('button', { name: '使用我的模型开始评价' }).click();
}

async function hitTargetHeight(locator: ReturnType<Page['getByRole']>) {
  return locator.evaluate((element) => element.getBoundingClientRect().height);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    })),
  ).toEqual({ clientWidth: 375, scrollWidth: 375 });
}

function monitorBrowserIssues(
  page: Page,
  issues = { consoleErrors: [] as string[], serverErrors: [] as string[] },
) {
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => issues.consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 500)
      issues.serverErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}
