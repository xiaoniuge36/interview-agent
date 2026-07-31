import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { registerUser } from './helpers/api';
import { signInUser } from './helpers/auth';

const NOT_FOUND_RESOURCE_ERROR =
  'Failed to load resource: the server responded with a status of 404 (Not Found)';

test('keeps interview report status actionable across retry and refresh', async ({ page }) => {
  test.setTimeout(120_000);
  const issues = monitorBrowserIssues(page);
  const user = await registerUser('interview-report-status');
  const sessions = await seedReportStatusSessions(user.email);
  await signInUser(page, user);
  await page.setViewportSize({ width: 375, height: 812 });

  for (const fixture of sessions) {
    const href = `/interview?session=${fixture.id}`;
    await page.goto(href);
    await expect(page).toHaveURL(href);
    await expect(page.getByRole('region', { name: /本轮面试状态/ })).toBeVisible();
    await expect(page.getByText(fixture.heading)).toBeVisible();
    await expect(page.locator('#interview-report').getByText(fixture.detail)).toBeVisible();
    await expect(
      page.locator('.transcript .turn.interviewer').filter({ hasText: fixture.transcript }),
    ).toBeVisible();

    const retry = page.getByRole('button', { name: fixture.retryLabel });
    await expect(retry).toBeVisible();
    expect((await retry.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    for (const competingCta of fixture.competingCtas ?? []) {
      await expect(page.getByRole('button', { name: competingCta })).toHaveCount(0);
    }
    await expectNoHorizontalOverflow(page);

    const requestsBeforeRetry = fixture.retriesReport
      ? (issues.reportReads[fixture.id] ?? 0)
      : (issues.sessionReads[fixture.id] ?? 0);
    await retry.focus();
    await expect(retry).toBeFocused();
    await retry.click();
    await expect
      .poll(() =>
        fixture.retriesReport
          ? (issues.reportReads[fixture.id] ?? 0)
          : (issues.sessionReads[fixture.id] ?? 0),
      )
      .toBeGreaterThan(requestsBeforeRetry);
    await expect(page).toHaveURL(href);

    await page.reload();
    await expect(page).toHaveURL(href);
    await expect(page.getByText(fixture.heading)).toBeVisible();
    await expect(page.locator('#interview-report').getByText(fixture.detail)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  expectOnlyKnownReportNotFound(issues, sessions);
  expect(issues.serverErrors).toEqual([]);
});

type ReportStatusFixture = {
  id: string;
  heading: RegExp;
  detail: RegExp;
  retryLabel: RegExp;
  transcript: string;
  retriesReport?: boolean;
  competingCtas?: string[];
};

async function seedReportStatusSessions(email: string): Promise<ReportStatusFixture[]> {
  const database = new PrismaClient();
  try {
    const identity = await database.user.findFirstOrThrow({ where: { email } });
    const generating = await createSession(database, identity, 'generating_report');
    const failed = await createSession(database, identity, 'failed');
    const unreadable = await createSession(database, identity, 'report_ready');
    return [
      {
        id: generating.id,
        heading: /AI 正在生成本轮复盘/,
        detail: /阶段和面试对话已保存/,
        retryLabel: /重新检查生成状态/,
        transcript: generating.transcript,
      },
      {
        id: failed.id,
        heading: /本轮复盘未完成/,
        detail: /已保存的面试对话不会丢失/,
        retryLabel: /重新检查本轮状态/,
        transcript: failed.transcript,
      },
      {
        id: unreadable.id,
        heading: /AI 复盘已生成/,
        detail: /报告内容暂时无法读取/,
        retryLabel: /重新加载本轮复盘/,
        transcript: unreadable.transcript,
        retriesReport: true,
        competingCtas: ['重新开始本轮', '开始模拟面试'],
      },
    ];
  } finally {
    await database.$disconnect();
  }
}

async function createSession(
  database: PrismaClient,
  identity: { id: string; tenantId: string },
  status: 'generating_report' | 'failed' | 'report_ready',
) {
  const suffix = randomUUID();
  const id = `interview_report_status_${suffix}`;
  const commandId = `command_report_status_${suffix}`;
  const traceId = `trace-report-status-${suffix}`;
  const transcript =
    status === 'failed' ? '本轮对话已保存，失败后仍可恢复。' : '阶段和面试对话已保存。';
  await createInterviewStatusSession(database, identity, { id, status, suffix });
  await createInterviewStatusCommand(database, identity, { id, commandId, traceId, suffix });
  await createInterviewStatusTurn(database, identity, {
    id,
    commandId,
    traceId,
    suffix,
    transcript,
  });
  return { id, transcript };
}

async function createInterviewStatusSession(
  database: PrismaClient,
  identity: { id: string; tenantId: string },
  input: { id: string; status: 'generating_report' | 'failed' | 'report_ready'; suffix: string },
) {
  await database.interviewSession.create({
    data: {
      id: input.id,
      tenantId: identity.tenantId,
      userId: identity.id,
      status: input.status,
      stage: input.status === 'report_ready' ? 'report_ready' : 'final_evaluation',
      version: 8,
      eventSequence: 8,
      workflowRunId: `workflow-report-status-${input.suffix}`,
      title: `报告状态审查 ${input.status}`,
    },
  });
}

async function createInterviewStatusCommand(
  database: PrismaClient,
  identity: { id: string; tenantId: string },
  input: { id: string; commandId: string; traceId: string; suffix: string },
) {
  await database.interviewCommand.create({
    data: {
      id: input.commandId,
      tenantId: identity.tenantId,
      sessionId: input.id,
      actorId: identity.id,
      idempotencyKey: `report-status-${input.suffix}`,
      fingerprint: `report-status-${input.suffix}`,
      type: 'advance',
      expectedVersion: 7,
      status: 'completed',
      traceId: input.traceId,
      attemptCount: 1,
      completedAt: new Date(),
    },
  });
}

async function createInterviewStatusTurn(
  database: PrismaClient,
  identity: { id: string; tenantId: string },
  input: {
    id: string;
    commandId: string;
    traceId: string;
    suffix: string;
    transcript: string;
  },
) {
  await database.interviewTurn.create({
    data: {
      id: `turn-report-status-${input.suffix}`,
      tenantId: identity.tenantId,
      sessionId: input.id,
      commandId: input.commandId,
      role: 'interviewer',
      stage: 'scenario_design',
      content: input.transcript,
      traceId: input.traceId,
    },
  });
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
  const issues = {
    consoleErrors: [] as string[],
    notFoundResponses: [] as string[],
    serverErrors: [] as string[],
    sessionReads: {} as Record<string, number>,
    reportReads: {} as Record<string, number>,
  };
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => issues.consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 404) issues.notFoundResponses.push(response.url());
    if (response.status() >= 500)
      issues.serverErrors.push(`${response.status()} ${response.url()}`);
    const match = response.url().match(/\/api\/interviews\/([^/]+)$/u);
    if (response.request().method() === 'GET' && match) {
      issues.sessionReads[match[1]] = (issues.sessionReads[match[1]] ?? 0) + 1;
    }
    const reportMatch = response.url().match(/\/api\/interviews\/([^/]+)\/report$/u);
    if (response.request().method() === 'GET' && reportMatch) {
      issues.reportReads[reportMatch[1]] = (issues.reportReads[reportMatch[1]] ?? 0) + 1;
    }
  });
  return issues;
}

function expectOnlyKnownReportNotFound(
  issues: ReturnType<typeof monitorBrowserIssues>,
  sessions: ReportStatusFixture[],
) {
  const unreadable = sessions.find((fixture) => fixture.retriesReport);
  const expectedPath = `/api/interviews/${unreadable?.id}/report`;
  const notFoundConsoleErrors = issues.consoleErrors.filter(
    (message) => message === NOT_FOUND_RESOURCE_ERROR,
  );
  expect(issues.notFoundResponses.length).toBeGreaterThan(0);
  expect(issues.notFoundResponses.every((url) => url.endsWith(expectedPath))).toBe(true);
  expect(notFoundConsoleErrors).toHaveLength(issues.notFoundResponses.length);
  expect(issues.consoleErrors).toEqual(notFoundConsoleErrors);
}
