import type { ProductRequestContext } from '../../common/context/request-context';
import { createPracticeReportData, mapReport, practiceSessionData } from './practice-mappers';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'consumer-tenant',
  actor: {
    id: 'consumer-user',
    subject: 'consumer-user',
    tenantId: 'consumer-tenant',
    role: 'user',
    scopes: ['practice:create'],
  },
};

describe('practiceSessionData', () => {
  it('connects each session item to the question source tenant', () => {
    const data = practiceSessionData(
      context,
      { mode: 'manual', questionIds: ['public-question'] },
      [{ id: 'public-question', tenantId: 'public-tenant' }],
    );

    expect(data.items).toMatchObject({
      create: [
        {
          question: {
            connect: {
              tenantId_id: { tenantId: 'public-tenant', id: 'public-question' },
            },
          },
        },
      ],
    });
  });
});

test('persists grounded Runtime report fields and exposes only safe source evidence', () => {
  const runtime = {
    contractVersion: 'practice-report-runtime.v1' as const,
    overallScore: 72,
    summary: 'Capacity planning needs a quantified example.',
    strengths: ['Explains the main boundary.'],
    weaknesses: ['Capacity planning'],
    nextActions: ['Add a quantified capacity example.'],
    reportMarkdown: '# Runtime report',
    sourceIds: ['chunk-1'],
    memoryEvents: [],
    fallbackUsed: false,
  };
  const data = createPracticeReportData(
    sessionRecord() as never,
    [evaluationRecord()] as never,
    runtime,
  );
  const mapped = mapReport(
    {
      ...reportRecord(),
      summary: runtime.summary,
      reportMarkdown: runtime.reportMarkdown,
      structuredData: { runtime: { sourceIds: runtime.sourceIds, fallbackUsed: false } },
    } as never,
    [{ evaluation: evaluationRecord() as never }],
  );

  expect(data).toMatchObject({ summary: runtime.summary, reportMarkdown: runtime.reportMarkdown });
  expect(mapped.evidence).toEqual([{ sourceId: 'chunk-1' }]);
  expect(mapped.fallbackUsed).toBe(false);
});

function sessionRecord() {
  return { id: 'session-1', tenantId: 'tenant-1', title: 'System design' };
}

function evaluationRecord() {
  return {
    id: 'evaluation-1',
    sessionItemId: 'item-1',
    score: 72,
    feedback: 'The boundary is clear.',
    missingPoints: ['Capacity planning'],
    rubricScores: [],
    followUpQuestion: null,
    createdAt: new Date('2026-07-28T00:00:00.000Z'),
  };
}

function reportRecord() {
  return {
    id: 'report-1',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    overallScore: 72,
    summary: 'Summary',
    strengths: [],
    weaknesses: [],
    nextActions: [],
    reportMarkdown: '# Report',
    structuredData: {},
    createdAt: new Date('2026-07-28T00:00:00.000Z'),
    updatedAt: new Date('2026-07-28T00:00:00.000Z'),
  };
}
