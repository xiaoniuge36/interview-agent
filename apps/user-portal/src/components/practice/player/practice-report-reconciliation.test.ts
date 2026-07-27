import { describe, expect, it, vi } from 'vitest';
import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import {
  loadPracticeCompletionExtras,
  practiceReportOutcome,
  reconcilePracticeReport,
} from './practice-report-reconciliation';

describe('复盘主命令边界', () => {
  it('主命令失败时拒绝且不启动后续读取', async () => {
    const failure = new Error('submit failed');
    const loadSession = vi.fn();
    const loadMastery = vi.fn();

    await expect(
      reconcilePracticeReport({
        currentSession,
        submitReport: vi.fn().mockRejectedValue(failure),
        loadSession,
        loadMastery,
      }),
    ).rejects.toBe(failure);
    expect(loadSession).not.toHaveBeenCalled();
    expect(loadMastery).not.toHaveBeenCalled();
  });
});

describe('复盘成功后对账', () => {
  it('两项读取成功时使用服务端最新状态', async () => {
    const result = await reconcilePracticeReport(
      dependencies({ session: syncedSession, mastery: [mastery] }),
    );

    expect(result).toEqual({
      report,
      session: syncedSession,
      mastery: [mastery],
      synchronizationComplete: true,
    });
  });

  it('session 读取失败时仍返回报告和本地完成态', async () => {
    const result = await reconcilePracticeReport(
      dependencies({ session: new Error('session unavailable'), mastery: [mastery] }),
    );

    expect(result.report).toBe(report);
    expect(result.session).toEqual({ ...currentSession, status: 'report_ready' });
    expect(result.mastery).toEqual([mastery]);
    expect(result.synchronizationComplete).toBe(false);
  });

  it('mastery 读取失败时保留最新 session 并返回空对账值', async () => {
    const result = await reconcilePracticeReport(
      dependencies({ session: syncedSession, mastery: new Error('mastery unavailable') }),
    );

    expect(result.session).toBe(syncedSession);
    expect(result.mastery).toBeNull();
    expect(result.synchronizationComplete).toBe(false);
  });

  it('两项读取都失败时仍保留报告并进入完成态', async () => {
    const result = await reconcilePracticeReport(
      dependencies({
        session: new Error('session unavailable'),
        mastery: new Error('mastery unavailable'),
      }),
    );

    expect(result).toMatchObject({
      report,
      session: { id: currentSession.id, status: 'report_ready' },
      mastery: null,
      synchronizationComplete: false,
    });
  });
});

describe('复盘结果反馈', () => {
  it('完整同步使用成功反馈', () => {
    expect(practiceReportOutcome(true)).toMatchObject({ tone: 'success' });
  });

  it('部分同步明确说明刷新后继续同步', () => {
    expect(practiceReportOutcome(false)).toEqual({
      tone: 'info',
      message: 'AI 复盘已生成，部分训练状态将在刷新后继续同步。',
      notificationDetail: '报告已保留；刷新页面可继续同步训练状态与能力记录。',
    });
  });
});

describe('完成页附属数据读取', () => {
  it('未完成 session 不读取报告或能力记录', async () => {
    const loadReport = vi.fn();
    const loadMastery = vi.fn();

    await expect(
      loadPracticeCompletionExtras({ session: currentSession, loadReport, loadMastery }),
    ).resolves.toEqual({ report: null, mastery: [] });
    expect(loadReport).not.toHaveBeenCalled();
    expect(loadMastery).not.toHaveBeenCalled();
  });

  it('能力记录失败时仍保留报告', async () => {
    await expect(completionExtras(report, new Error('mastery unavailable'))).resolves.toEqual({
      report,
      mastery: [],
    });
  });

  it('报告失败时仍保留能力记录', async () => {
    await expect(completionExtras(new Error('report unavailable'), [mastery])).resolves.toEqual({
      report: null,
      mastery: [mastery],
    });
  });

  it('两项成功时返回全部附属数据', async () => {
    await expect(completionExtras(report, [mastery])).resolves.toEqual({
      report,
      mastery: [mastery],
    });
  });

  it('两项失败时返回安全空值', async () => {
    await expect(
      completionExtras(new Error('report unavailable'), new Error('mastery unavailable')),
    ).resolves.toEqual({ report: null, mastery: [] });
  });
});

function dependencies(input: {
  session: PracticeSession | Error;
  mastery: MasteryProfile[] | Error;
}) {
  return {
    currentSession,
    submitReport: vi.fn().mockResolvedValue(report),
    loadSession: settled(input.session),
    loadMastery: settled(input.mastery),
  };
}

function settled<T>(value: T | Error) {
  return value instanceof Error
    ? vi.fn().mockRejectedValue(value)
    : vi.fn().mockResolvedValue(value);
}

function completionExtras(
  reportResult: PracticeReport | Error,
  masteryResult: MasteryProfile[] | Error,
) {
  return loadPracticeCompletionExtras({
    session: syncedSession,
    loadReport: settled(reportResult),
    loadMastery: settled(masteryResult),
  });
}

const currentSession = {
  id: 'session-1',
  status: 'in_progress',
  items: [{ id: 'item-1' }],
} as PracticeSession;

const syncedSession = { ...currentSession, status: 'report_ready' } as PracticeSession;

const report = {
  id: 'report-1',
  sessionId: currentSession.id,
  overallScore: 82,
} as PracticeReport;

const mastery = {
  id: 'mastery-1',
  tag: '系统设计',
  score: 80,
} as MasteryProfile;
