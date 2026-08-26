import type { InterviewSessionSummary, PracticeHistoryItem } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import {
  buildTrainingRecords,
  filterTrainingRecords,
  formatTrainingRecordDate,
  searchTrainingRecords,
  summarizeTrainingRecords,
} from './training-records-model';

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
  } as InterviewSessionSummary,
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

  it('searches record titles, types, states, facts, and weakness signals', () => {
    const records = buildTrainingRecords(practices, interviews);

    expect(searchTrainingRecords(records, 'trade-offs').map((record) => record.id)).toEqual([
      'practice-newer',
    ]);
    expect(searchTrainingRecords(records, '模拟面试').map((record) => record.id)).toEqual([
      'interview-older',
    ]);
  });

  it('formats each training record time with seconds', () => {
    expect(formatTrainingRecordDate('2026-07-22T10:00:08.000Z')).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('summarizes only persisted training evidence', () => {
    expect(summarizeTrainingRecords(buildTrainingRecords(practices, interviews))).toEqual({
      total: 2,
      practice: 1,
      interview: 1,
      reviewed: 2,
    });
  });
});

it('adds persisted interview scores, weakest stages, and the previous-score trend', () => {
  const interviewHistory = [
    {
      id: 'interview-latest',
      title: 'Payment platform follow-up',
      status: 'report_ready',
      updatedAt: '2026-07-23T10:00:00.000Z',
    },
    interviews[0],
  ] as InterviewSessionSummary[];
  const reports = [
    interviewReport('interview-latest', 54, 42),
    interviewReport('interview-older', 35, 30),
  ];

  const records = buildTrainingRecords([], interviewHistory, reports as never);

  expect(records[0]).toMatchObject({
    id: 'interview-latest',
    score: 54,
    signals: ['项目深挖 42 分'],
    trend: { delta: 19, previousScore: 35 },
  });
  expect(records[1]?.trend).toBeNull();
});

it('does not invent a previous-round trend across a missing adjacent score', () => {
  const interviewHistory = [
    interviewSession('interview-latest', '2026-07-23T10:00:00.000Z'),
    interviewSession('interview-missing', '2026-07-22T10:00:00.000Z'),
    interviewSession('interview-oldest', '2026-07-21T10:00:00.000Z'),
  ];
  const reports = [
    interviewReport('interview-latest', 54, 42),
    interviewReport('interview-oldest', 35, 30),
  ];

  const records = buildTrainingRecords([], interviewHistory, reports as never);

  expect(records[0]?.trend).toBeNull();
});

function interviewSession(id: string, updatedAt: string) {
  return { id, title: id, status: 'report_ready', updatedAt } as InterviewSessionSummary;
}

function interviewReport(sessionId: string, overallScore: number, stageScore: number) {
  return {
    sessionId,
    overall: { score: overallScore },
    stageScores: [
      {
        stage: 'project_deep_dive',
        score: stageScore,
        summary: '项目证据链不足。',
        evidence: ['缺少量化结果'],
      },
    ],
  };
}
