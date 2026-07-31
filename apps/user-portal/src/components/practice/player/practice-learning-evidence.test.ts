import type { PracticeReport, PracticeSession } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { parseLearningProgress } from '@/lib/learning/learning-progress';
import { persistLearningPracticeEvidence } from './practice-learning-evidence';

const courseSlug = '01-agent基础与上下文工程';
const origin = {
  status: 'ready' as const,
  courseSlug,
  courseTitle: 'Agent 基础与上下文工程',
  topicLabel: 'ReAct',
  topicSlug: 'react',
  query: { tags: ['ReAct'], type: 'single_choice' as const },
};

const session = {
  id: 'session-1',
  tenantId: 'tenant-1',
  status: 'report_ready',
  items: [{ answer: 'first' }, { answer: 'second' }, { answer: null }],
} as PracticeSession;

const report = {
  sessionId: session.id,
  tenantId: session.tenantId,
  overallScore: 86,
  updatedAt: '2026-07-30T08:00:00.000Z',
} as PracticeReport;

describe('persistLearningPracticeEvidence', () => {
  it('stores only a report-backed learning verification without answer content', () => {
    const storage = memoryStorage();

    expect(persistLearningPracticeEvidence({ origin, session, report, storage })).toBe(true);

    const progress = parseLearningProgress(
      storage.getItem('interview-agent:learning-progress:v1'),
      [courseSlug],
    );
    expect(progress.verificationByCourse[courseSlug]).toEqual({
      sessionId: session.id,
      topic: 'ReAct',
      score: 86,
      answerCount: 2,
      recordedAt: report.updatedAt,
    });
    expect(storage.getItem('interview-agent:learning-progress:v1')).not.toContain('first');
  });

  it('does not write for a crafted origin without matching report facts', () => {
    const storage = memoryStorage();

    expect(
      persistLearningPracticeEvidence({
        origin,
        session,
        report: { ...report, sessionId: 'different-session' },
        storage,
      }),
    ).toBe(false);

    expect(storage.getItem('interview-agent:learning-progress:v1')).toBeNull();
  });
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}
