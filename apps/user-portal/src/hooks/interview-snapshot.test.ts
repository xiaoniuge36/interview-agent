import { describe, expect, it, vi } from 'vitest';
import type { InterviewReport, InterviewSession } from '@interview-agent/contracts';
import { loadInterviewSnapshot } from './interview-snapshot';

describe('面试快照恢复', () => {
  it('session 读取失败时返回 error 且不读取报告', async () => {
    const failure = new Error('session unavailable');
    const loadReport = vi.fn();

    await expect(
      loadInterviewSnapshot({
        loadSession: vi.fn().mockRejectedValue(failure),
        loadReport,
      }),
    ).resolves.toEqual({ status: 'error', error: failure });
    expect(loadReport).not.toHaveBeenCalled();
  });

  it('未完成 session 不读取报告', async () => {
    const loadReport = vi.fn();
    const session = interviewSession('waiting_user');

    await expect(
      loadInterviewSnapshot({ loadSession: vi.fn().mockResolvedValue(session), loadReport }),
    ).resolves.toEqual({ status: 'ready', session, report: null });
    expect(loadReport).not.toHaveBeenCalled();
  });

  it('report_ready 且报告可读时返回完整快照', async () => {
    const session = interviewSession('report_ready');

    await expect(
      loadInterviewSnapshot({
        loadSession: vi.fn().mockResolvedValue(session),
        loadReport: vi.fn().mockResolvedValue(report),
      }),
    ).resolves.toEqual({ status: 'ready', session, report });
  });

  it('报告读取失败时保留 session 并返回 partial', async () => {
    const session = interviewSession('report_ready');

    await expect(
      loadInterviewSnapshot({
        loadSession: vi.fn().mockResolvedValue(session),
        loadReport: vi.fn().mockRejectedValue(new Error('report unavailable')),
      }),
    ).resolves.toEqual({ status: 'partial', session, report: null });
  });
});

function interviewSession(status: InterviewSession['status']): InterviewSession {
  return {
    id: 'interview-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    status,
    stage: status === 'report_ready' ? 'report_ready' : 'tech_basics',
    version: 1,
    eventSequence: 1,
    workflowRunId: 'run-1',
    title: '前端工程师模拟面试',
    turns: [],
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
  };
}

const report = {
  id: 'report-1',
  sessionId: 'interview-1',
  overall: { score: 82, summary: '完成复盘' },
} as InterviewReport;
