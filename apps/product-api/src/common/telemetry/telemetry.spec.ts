import { sanitizeSpanAttributes } from './telemetry';

test('sanitizes span attributes before export', () => {
  expect(
    sanitizeSpanAttributes({
      'interview_agent.trace_id': 'trace-test-0001',
      operation: 'practice_report',
      apiKey: 'secret-key',
      Authorization: 'Bearer secret',
      answer: 'full candidate answer',
      systemPrompt: 'hidden prompt',
      completion: 'raw output',
    }),
  ).toEqual({
    'interview_agent.trace_id': 'trace-test-0001',
    operation: 'practice_report',
  });
});

test('drops the legacy retrieval query preview attribute entirely', () => {
  expect(
    sanitizeSpanAttributes({
      'retrieval.query_preview': 'confidential query text',
    }),
  ).toEqual({});
});
