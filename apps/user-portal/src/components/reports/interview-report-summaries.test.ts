import type { InterviewReport, InterviewSessionSummary } from '@interview-agent/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  INTERVIEW_REPORT_SUMMARY_CONCURRENCY,
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

  it('caps in-flight report requests at the concurrency budget', async () => {
    const interviews = Array.from({ length: 12 }, (_, index) => interview(index));
    let active = 0;
    let peak = 0;
    const load = vi.fn(async (id: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return report(id);
    });

    const result = await loadInterviewReportSummaries(interviews, load);

    expect(peak).toBeLessThanOrEqual(INTERVIEW_REPORT_SUMMARY_CONCURRENCY);
    expect(load).toHaveBeenCalledTimes(12);
    expect(result.items).toHaveLength(12);
  });
});

function interview(index: number) {
  return {
    id: `interview-${index}`,
    status: 'report_ready',
    updatedAt: new Date(Date.UTC(2026, 6, index + 1)).toISOString(),
  } as InterviewSessionSummary;
}

function report(sessionId: string) {
  return { sessionId } as InterviewReport;
}
