import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { registerUser } from './helpers/api';
import { signInUser } from './helpers/auth';

test('connects interview diagnosis, focused review, and score trend on mobile', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const browserIssues = monitorBrowserIssues(page);
  const user = await registerUser('interview-review-loop');
  const database = new PrismaClient();
  const identity = await database.user.findFirstOrThrow({ where: { email: user.email } });
  const previous = await seedReport(database, identity, {
    score: 35,
    projectScore: 30,
    suffix: '第一次',
  });
  const latest = await seedReport(database, identity, {
    score: 54,
    projectScore: 42,
    suffix: '最近一次',
  });
  await database.$disconnect();

  await signInUser(page, user);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/interview?session=${latest.id}`);

  const reportJump = page.getByRole('link', { name: '直接查看本轮复盘' });
  await expect(reportJump).toBeVisible();
  const jumpBox = await reportJump.boundingBox();
  expect(jumpBox?.height).toBeGreaterThanOrEqual(44);
  expect(jumpBox?.y).toBeLessThan(page.viewportSize()?.height ?? 0);
  await reportJump.click();

  const report = page.locator('#interview-report');
  await expect(report).toBeFocused();
  await expect(report).toContainText('为什么是 42 分');
  await expect(report).toContainText('没有说明故障恢复如何验证');
  await expect(report).toContainText('首要复练 · 项目深挖');

  const reviewAction = page.getByRole('button', { name: '开始专项回练' });
  await expect(reviewAction).toBeVisible();
  const actionBox = await reviewAction.boundingBox();
  expect(actionBox?.height).toBeGreaterThanOrEqual(44);
  await reviewAction.click();
  await expect(page).toHaveURL(/\/practice\?session=/);
  await expectNoHorizontalOverflow(page);
  await completeInterviewReview(page, latest.id);
  await expectTrendArchive(page);
  expect(previous.id).not.toBe(latest.id);
  expect(browserIssues.consoleErrors).toEqual([]);
  expect(browserIssues.serverErrors).toEqual([]);
});

async function completeInterviewReview(page: Page, sourceSessionId: string) {
  await expect(page).toHaveURL(/\/practice\?session=/);
  const practiceSessionId = new URL(page.url()).searchParams.get('session');
  expect(practiceSessionId).toBeTruthy();
  await seedCompletedReviewPractice(practiceSessionId!, sourceSessionId);
  await page.reload();

  const returnLink = page.getByRole('link', { name: '回看来源面试复盘' });
  await expect(returnLink).toBeVisible();
  expect((await returnLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await returnLink.focus();
  await expect(returnLink).toBeFocused();
  await returnLink.press('Enter');
  await expectReturnedEvidence(page, sourceSessionId, practiceSessionId!);
}

async function seedCompletedReviewPractice(practiceSessionId: string, sourceSessionId: string) {
  const database = new PrismaClient();
  try {
    const session = await database.practiceSession.findUniqueOrThrow({
      where: { id: practiceSessionId },
    });
    expect(session.sourceInterviewSessionId).toBe(sourceSessionId);
    await database.practiceSession.update({
      where: { id: practiceSessionId },
      data: { status: 'report_ready', submittedAt: new Date(), reportedAt: new Date() },
    });
    await database.practiceReport.create({
      data: {
        tenantId: session.tenantId,
        sessionId: practiceSessionId,
        overallScore: 76,
        summary: '已补充恢复验证与降级条件。',
        strengths: ['恢复验证更具体'],
        weaknesses: ['容量边界仍需量化'],
        nextActions: ['补充故障演练结果'],
        reportMarkdown: '# 专项复练报告',
        structuredData: { runtime: { sourceIds: [], fallbackUsed: false } },
      },
    });
  } finally {
    await database.$disconnect();
  }
}

async function expectReturnedEvidence(
  page: Page,
  sourceSessionId: string,
  practiceSessionId: string,
) {
  const expected = `/interview?session=${sourceSessionId}&reviewPractice=${practiceSessionId}#interview-review-evidence`;
  await expect(page).toHaveURL(expected);
  const evidence = page.locator('#interview-review-evidence');
  await expect(evidence).toBeFocused();
  await expect(evidence).toContainText('本次复练 76 分');
  await expect(evidence).toContainText('容量边界仍需量化');
  await expect(evidence).toContainText('补充故障演练结果');
  await expect(page.locator('#interview-report')).toContainText(/为什么是 42 分/);
  await page.reload();
  await expect(evidence).toContainText('本次复练 76 分');
  await expectNoHorizontalOverflow(page);
}

async function expectTrendArchive(page: Page) {
  await page.goto('/reports');
  const latestRecord = page.locator('.training-archive-record').filter({ hasText: '最近一次' });
  await expect(latestRecord).toContainText('54');
  await expect(latestRecord).toContainText('项目深挖 42 分');
  await expect(latestRecord).toContainText('较上一轮 +19');
  await page.reload();
  await expect(latestRecord).toContainText('较上一轮 +19');
  await expectNoHorizontalOverflow(page);
}

async function expectNoHorizontalOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(width.scrollWidth).toBe(width.clientWidth);
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

async function seedReport(
  database: PrismaClient,
  identity: { id: string; tenantId: string },
  input: { score: number; projectScore: number; suffix: string },
) {
  const createdAt = new Date(Date.UTC(2026, 6, input.suffix === '第一次' ? 27 : 29, 9));
  const session = await database.interviewSession.create({
    data: {
      tenantId: identity.tenantId,
      userId: identity.id,
      status: 'report_ready',
      stage: 'report_ready',
      version: 8,
      eventSequence: 8,
      title: `支付平台模拟 · ${input.suffix}`,
      createdAt,
      updatedAt: createdAt,
    },
  });
  await database.interviewReport.create({
    data: reportData(identity.tenantId, session.id, { ...input, createdAt }),
  });
  return session;
}

function reportData(
  tenantId: string,
  sessionId: string,
  input: { score: number; projectScore: number; createdAt: Date },
) {
  return {
    tenantId,
    sessionId,
    overall: {
      score: input.score,
      summary: '方案可行，但恢复验证与量化结果仍不完整。',
      hiringSignal: 'mixed',
    },
    stageScores: [
      {
        stage: 'project_deep_dive',
        score: input.projectScore,
        summary: '方案描述停留在做法，缺少恢复验证与量化结果。',
        evidence: ['没有说明故障恢复如何验证'],
      },
      {
        stage: 'scenario_design',
        score: 54,
        summary: '容量边界与失败降级不清晰。',
        evidence: ['没有说明降级触发条件'],
      },
    ],
    turnFeedback: [],
    projectDiagnosis: ['异常恢复验证不足'],
    nextActions: ['补齐异常恢复的验证方法'],
    memoryEvents: [],
    createdAt: input.createdAt,
  };
}
