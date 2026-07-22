import type { InterviewSession, PracticeHistoryItem } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { buildTrainingRecords, filterTrainingRecords } from './training-records-model';

const practices = [
  {
    id: 'practice-newer',
    title: 'System design review',
    mode: 'manual',
    status: 'report_ready',
    questionCount: 3,
    answeredCount: 3,
    evaluatedCount: 3,
    overallScore: 86,
    weaknesses: ['Explain trade-offs'],
    reportedAt: '2026-07-22T09:00:00.000Z',
    updatedAt: '2026-07-22T10:00:00.000Z',
  },
] satisfies PracticeHistoryItem[];

const interviews = [
  {
    id: 'interview-older',
    title: 'Product interview',
    status: 'report_ready',
    updatedAt: '2026-07-21T10:00:00.000Z',
  } as InterviewSession,
];

describe('training records model', () => {
  it('merges practice and interview records in recent-first order', () => {
    const records = buildTrainingRecords(practices, interviews);

    expect(records.map((record) => record.id)).toEqual(['practice-newer', 'interview-older']);
    expect(records[0]).toMatchObject({
      kind: 'practice',
      href: '/practice?session=practice-newer',
      score: 86,
      signals: ['Explain trade-offs'],
    });
  });

  it('filters the archive without losing the record links', () => {
    const records = buildTrainingRecords(practices, interviews);

    expect(filterTrainingRecords(records, 'practice')).toHaveLength(1);
    expect(filterTrainingRecords(records, 'interview')[0]?.href).toBe(
      '/interview?session=interview-older',
    );
  });
});
