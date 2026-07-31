import type { InterviewReport, InterviewSession } from '@interview-agent/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  INTERVIEW_REPORT_SUMMARY_LIMIT,
  loadInterviewReportSummaries,
} from './interview-report-summaries';

describe('interview report summary budget', () => {
  it('loads only the latest 20 completed interview reports', async () => {
    const interviews = Array.from({ length: 25 }, (_, index) => interview(index));
    const load = vi.fn(async (id: string) => report(id));

    const result = await loadInterviewReportSummaries(interviews, load);

    expect(INTERVIEW_REPORT_SUMMARY_LIMIT).toBe(20);
    expect(load).toHaveBeenCalledTimes(20);
    expect(load.mock.calls.map(([id]) => id)).toEqual(
      Array.from({ length: 20 }, (_, index) => `interview-${24 - index}`),
    );
    expect(result).toMatchObject({ failed: false });
    expect(result.items).toHaveLength(20);
  });

  it('marks partial only when a requested report fails', async () => {
    const interviews = Array.from({ length: 21 }, (_, index) => interview(index));
    const load = vi.fn(async (id: string) => {
      if (id === 'interview-20') throw new Error('report unavailable');
      return report(id);
    });

    const result = await loadInterviewReportSummaries(interviews, load);

    expect(load).not.toHaveBeenCalledWith('interview-0');
    expect(result.failed).toBe(true);
    expect(result.items).toHaveLength(19);
  });
});

function interview(index: number) {
  return {
    id: `interview-${index}`,
    status: 'report_ready',
    updatedAt: new Date(Date.UTC(2026, 6, index + 1)).toISOString(),
  } as InterviewSession;
}

function report(sessionId: string) {
  return { sessionId } as InterviewReport;
}
