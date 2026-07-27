import { describe, expect, it } from 'vitest';
import type { Dashboard } from '@interview-agent/contracts';
import { getAdminAttentionItems } from './admin-attention-queue';

const dashboard: Dashboard = {
  stats: {
    publishedQuestions: 12,
    pendingCandidates: 4,
    activeInterviews: 2,
    reportsReady: 8,
    schemaPassRate: 92,
    avgLatencyMs: 320,
  },
  importPipeline: [
    { stage: 'received', count: 3 },
    { stage: 'processing', count: 1 },
    { stage: 'review', count: 4 },
    { stage: 'published', count: 12 },
    { stage: 'failed', count: 2 },
  ],
  recentRuns: [run('run-1', 'failed', 180), run('run-2', 'fallback', 220)],
};

describe('admin attention queue', () => {
  it('prioritizes actionable governance risks and maps each one to an existing view', () => {
    expect(getAdminAttentionItems(dashboard)).toEqual([
      expect.objectContaining({ id: 'review-backlog', count: 4, view: 'content' }),
      expect.objectContaining({ id: 'failed-imports', count: 2, view: 'imports' }),
      expect.objectContaining({ id: 'runtime-risk', count: 2, view: 'runtime' }),
      expect.objectContaining({ id: 'schema-pass-rate', count: 92, view: 'questions' }),
    ]);
  });

  it('returns an empty queue when all dashboard signals are healthy', () => {
    expect(
      getAdminAttentionItems({
        ...dashboard,
        stats: { ...dashboard.stats, pendingCandidates: 0, schemaPassRate: 100 },
        importPipeline: dashboard.importPipeline.map((item) =>
          item.stage === 'failed' ? { ...item, count: 0 } : item,
        ),
        recentRuns: [run('run-3', 'succeeded', 200)],
      }),
    ).toEqual([]);
  });
});

function run(id: string, status: Dashboard['recentRuns'][number]['status'], latencyMs: number) {
  return {
    id,
    sessionId: null,
    type: 'mock_interview' as const,
    status,
    stage: 'interview',
    traceId: `trace-${id}-000`,
    latencyMs,
    schemaValid: true,
    fallbackUsed: status === 'fallback',
    attemptCount: 1,
    updatedAt: '2026-07-23T00:00:00.000Z',
  };
}
