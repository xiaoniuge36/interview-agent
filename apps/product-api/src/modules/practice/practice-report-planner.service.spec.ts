import { Logger } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PracticeReportPlannerService } from './practice-report-planner.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-practice-report-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:submit'],
  },
};

test('does not read report retrieval while the report RAG flag is disabled', async () => {
  const retrieval = { search: jest.fn() };
  const runtime = { report: jest.fn().mockResolvedValue(runtimeReport()) };
  const service = new PracticeReportPlannerService(
    { get: jest.fn().mockReturnValue(false) } as never,
    retrieval as never,
    runtime as never,
  );

  await expect(service.plan(context, sessionRecord() as never)).resolves.toMatchObject({
    overallScore: 72,
  });
  expect(retrieval.search).not.toHaveBeenCalled();
  expect(runtime.report.mock.calls[0]?.[0]).not.toHaveProperty('retrievalContext');
});

test('passes only bounded server-issued report sources after the quality gate', async () => {
  const retrieval = {
    search: jest.fn().mockResolvedValue({
      hits: [
        {
          id: 'chunk-1',
          entityType: 'knowledge',
          content: 'Capacity plans should state assumptions.',
        },
      ],
    }),
  };
  const runtime = { report: jest.fn().mockResolvedValue(runtimeReport()) };
  const service = new PracticeReportPlannerService(
    { get: jest.fn().mockReturnValue(true) } as never,
    retrieval as never,
    runtime as never,
  );

  await service.plan(context, sessionRecord() as never);

  expect(retrieval.search).toHaveBeenCalledWith(
    context,
    expect.objectContaining({ purpose: 'report', limit: 6 }),
  );
  expect(runtime.report).toHaveBeenCalledWith(
    expect.objectContaining({
      retrievalContext: [expect.objectContaining({ sourceId: 'chunk-1' })],
      evaluations: [expect.not.objectContaining({ answer: expect.anything() })],
    }),
    context,
  );
});

test('logs the fallback and returns null when the runtime report call fails', async () => {
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const retrieval = { search: jest.fn() };
  const runtime = { report: jest.fn().mockRejectedValue(new Error('runtime unavailable')) };
  const service = new PracticeReportPlannerService(
    { get: jest.fn().mockReturnValue(false) } as never,
    retrieval as never,
    runtime as never,
  );

  await expect(service.plan(context, sessionRecord() as never)).resolves.toBeNull();
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining('falling back to locally composed report'),
  );
  warn.mockRestore();
});

test('logs the degradation and keeps reporting without RAG when report retrieval fails', async () => {
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const retrieval = { search: jest.fn().mockRejectedValue(new Error('retrieval down')) };
  const runtime = { report: jest.fn().mockResolvedValue(runtimeReport()) };
  const service = new PracticeReportPlannerService(
    { get: jest.fn().mockReturnValue(true) } as never,
    retrieval as never,
    runtime as never,
  );

  await expect(service.plan(context, sessionRecord() as never)).resolves.toMatchObject({
    overallScore: 72,
  });
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining('Report retrieval context unavailable'),
  );
  expect(runtime.report.mock.calls[0]?.[0]).not.toHaveProperty('retrievalContext');
  warn.mockRestore();
});

function sessionRecord() {
  return {
    id: 'practice-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    title: 'System design',
    items: [
      {
        id: 'item-1',
        questionId: 'question-1',
        answer: 'candidate answer',
        question: { title: 'Design a rate limiter', tags: ['system-design'] },
        evaluation: {
          score: 72,
          feedback: 'The boundary is clear.',
          missingPoints: ['Capacity planning'],
        },
      },
    ],
  };
}

function runtimeReport() {
  return {
    contractVersion: 'practice-report-runtime.v1',
    overallScore: 72,
    summary: 'The round exposed one repeatable gap.',
    strengths: ['Explains the main boundary.'],
    weaknesses: ['Capacity planning'],
    nextActions: ['Add a quantified capacity example.'],
    reportMarkdown: '# Practice report',
    sourceIds: [],
    memoryEvents: [],
    fallbackUsed: false,
  };
}
