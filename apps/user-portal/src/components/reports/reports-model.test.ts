import type { InterviewSession } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { latestReportReadyInterview } from './reports-model';

function session(id: string, status: InterviewSession['status'], updatedAt: string) {
  return { id, status, updatedAt } as InterviewSession;
}

describe('latestReportReadyInterview', () => {
  it('selects the newest interview that has a persisted report', () => {
    const interviews = [
      session('running-newer', 'waiting_user', '2026-07-16T10:00:00.000Z'),
      session('report-older', 'report_ready', '2026-07-15T10:00:00.000Z'),
      session('report-newer', 'report_ready', '2026-07-16T09:00:00.000Z'),
    ];

    expect(latestReportReadyInterview(interviews)?.id).toBe('report-newer');
  });

  it('returns null when the user has no completed interview report', () => {
    expect(
      latestReportReadyInterview([
        session('created', 'created', '2026-07-16T09:00:00.000Z'),
        session('failed', 'failed', '2026-07-16T10:00:00.000Z'),
      ]),
    ).toBeNull();
  });
});
