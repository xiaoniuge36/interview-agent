import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { registerUser } from './helpers/api';
import { signInUser } from './helpers/auth';

const LOCAL_DRAFT = '我会先量化收益与发布风险，拆分为可灰度的最小方案。';
const FIRST_QUESTION = '请介绍一次你主导的前端性能优化。';
const PRIOR_ANSWER = '我先建立性能基线，再逐层定位主线程和网络瓶颈。';
const CURRENT_QUESTION = '如果优化方案影响发布节奏，你会如何权衡？';

test('returns from Settings to the same interview stage, transcript, and draft', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const browserIssues = monitorBrowserIssues(page);
  const user = await registerUser('interview-model-recovery');
  const sessionId = await seedInterview(user.email);
  const interviewHref = `/interview?session=${sessionId}`;
  const settingsHref = `/settings?returnTo=${encodeURIComponent(interviewHref)}`;
  await signInUser(page, user);
  await page.goto(interviewHref);

  await expectInterviewContext(page);
  const answer = page.getByLabel(/我的回答/);
  await answer.fill(LOCAL_DRAFT);
  const settingsLink = page.getByRole('link', { name: 'AI 模型设置' });
  await expect(settingsLink).toHaveAttribute('href', settingsHref);

  await page.setViewportSize({ width: 375, height: 812 });
  expect(await hitTargetHeight(settingsLink)).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
  await settingsLink.click();
  await expect(page).toHaveURL(settingsHref, { timeout: 20_000 });
  await createAndVerifyModel(page);

  const returnLink = page.getByRole('link', { name: '返回本轮面试' });
  await expect(returnLink).toHaveAttribute('href', interviewHref);
  await expect(page.getByText('默认模型已就绪，可以返回本轮面试继续作答。')).toBeVisible();
  expect(await hitTargetHeight(returnLink)).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
  await page.reload();
  await expect(page.getByRole('link', { name: '返回本轮面试' })).toBeVisible();

  await verifyNewTabAndUnsafeFallback({ page, user, settingsHref, interviewHref });
  await returnWithKeyboard(page, interviewHref);
  await expectInterviewContext(page);
  await expect(page.getByText('已恢复当前标签页草稿')).toBeVisible();
  await expect(page.getByLabel(/我的回答/)).toHaveValue(LOCAL_DRAFT);

  await page.reload();
  await expectInterviewContext(page);
  await expect(page.getByText('已恢复当前标签页草稿')).toBeVisible();
  await expect(page.getByLabel(/我的回答/)).toHaveValue(LOCAL_DRAFT);
  await expectNoHorizontalOverflow(page);
  expect(browserIssues.consoleErrors).toEqual([]);
  expect(browserIssues.serverErrors).toEqual([]);
});

async function seedInterview(email: string) {
  const database = new PrismaClient();
  const identity = await database.user.findFirstOrThrow({ where: { email } });
  const suffix = randomUUID();
  const ids = {
    sessionId: `interview_recovery_${suffix}`,
    commandId: `command_recovery_${suffix}`,
    traceId: `trace-interview-recovery-${suffix}`,
    suffix,
  };
  await createInterviewSession(database, identity, ids);
  await createInterviewCommand(database, identity, ids);
  await createInterviewTurns(database, identity, ids);
  await database.$disconnect();
  return ids.sessionId;
}

type SeedIdentity = { id: string; tenantId: string };
type SeedIds = { sessionId: string; commandId: string; traceId: string; suffix: string };

async function createInterviewSession(
  database: PrismaClient,
  identity: SeedIdentity,
  ids: SeedIds,
) {
  await database.interviewSession.create({
    data: {
      id: ids.sessionId,
      tenantId: identity.tenantId,
      userId: identity.id,
      status: 'waiting_user',
      stage: 'project_deep_dive',
      version: 4,
      eventSequence: 3,
      workflowRunId: `workflow_recovery_${ids.suffix}`,
      title: '高级前端工程师模拟面试',
    },
  });
}

async function createInterviewCommand(
  database: PrismaClient,
  identity: SeedIdentity,
  ids: SeedIds,
) {
  await database.interviewCommand.create({
    data: {
      id: ids.commandId,
      tenantId: identity.tenantId,
      sessionId: ids.sessionId,
      actorId: identity.id,
      idempotencyKey: `recovery-${ids.suffix}`,
      fingerprint: `recovery-${ids.suffix}`,
      type: 'advance',
      expectedVersion: 3,
      status: 'completed',
      traceId: ids.traceId,
      attemptCount: 1,
      completedAt: new Date(),
    },
  });
}

async function createInterviewTurns(database: PrismaClient, identity: SeedIdentity, ids: SeedIds) {
  const shared = {
    tenantId: identity.tenantId,
    sessionId: ids.sessionId,
    commandId: ids.commandId,
    traceId: ids.traceId,
  };
  await database.interviewTurn.createMany({
    data: [
      { ...shared, role: 'interviewer', stage: 'tech_basics', content: FIRST_QUESTION },
      { ...shared, role: 'candidate', stage: 'tech_basics', content: PRIOR_ANSWER },
      {
        ...shared,
        role: 'interviewer',
        stage: 'project_deep_dive',
        content: CURRENT_QUESTION,
      },
    ],
  });
}

async function expectInterviewContext(page: Page) {
  await expect(
    page.getByRole('region', { name: '本轮面试状态' }).getByText('项目深挖'),
  ).toBeVisible();
  await expect(page.getByText(FIRST_QUESTION)).toBeVisible();
  await expect(page.getByText(PRIOR_ANSWER)).toBeVisible();
  await expect(page.getByText(CURRENT_QUESTION)).toBeVisible();
}

async function createAndVerifyModel(page: Page) {
  await page.getByRole('button', { name: '连接第一个模型' }).click();
  await page.getByRole('combobox', { name: 'Provider' }).selectOption('openai_compatible');
  await page.getByLabel('模型名称').fill('e2e-model');
  await page.getByLabel('Base URL（仅自定义端点必填）').fill('https://model.e2e.test/v1');
  await page.getByLabel('API Key').fill('e2e-interview-recovery-secret-9876');
  await page.getByRole('button', { name: '加密保存连接' }).click();
  await page.getByRole('button', { name: '◌ 测试连接' }).click();
  await expect(page.getByRole('link', { name: '返回本轮面试' })).toBeVisible();
}

async function verifyNewTabAndUnsafeFallback(options: {
  page: Page;
  user: Awaited<ReturnType<typeof registerUser>>;
  settingsHref: string;
  interviewHref: string;
}) {
  const { page, user, settingsHref, interviewHref } = options;
  const settingsPage = await page.context().newPage();
  await settingsPage.goto(settingsHref);
  await settingsPage.getByLabel('邮箱').fill(user.email);
  await settingsPage.getByLabel('密码').fill(user.password);
  await settingsPage.getByRole('button', { name: '登录' }).click();
  await expect(settingsPage.getByRole('link', { name: '返回本轮面试' })).toHaveAttribute(
    'href',
    interviewHref,
  );
  await settingsPage.goto(
    '/settings?returnTo=https%3A%2F%2Fevil.example%2Finterview%3Fsession%3Dattack',
  );
  await expect(settingsPage.getByRole('link', { name: '返回题库继续组卷' })).toHaveAttribute(
    'href',
    '/questions',
  );
  await settingsPage.goto('/settings');
  await expect(settingsPage.getByRole('link', { name: '返回题库继续组卷' })).toBeVisible();
  await settingsPage.close();
}

async function returnWithKeyboard(page: Page, interviewHref: string) {
  const link = page.getByRole('link', { name: '返回本轮面试' });
  await link.focus();
  await expect(link).toBeFocused();
  await link.press('Enter');
  await expect(page).toHaveURL(interviewHref);
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

function monitorBrowserIssues(page: Page) {
  const issues = { consoleErrors: [] as string[], serverErrors: [] as string[] };
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
