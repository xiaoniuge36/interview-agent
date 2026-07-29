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

test('redacts sensitive values inside otherwise safe preview attributes', () => {
  expect(
    sanitizeSpanAttributes({
      'retrieval.query_preview': 'apiKey=sk-secret-value-123456 联系 13812345678',
    }),
  ).toEqual({ 'retrieval.query_preview': 'apiKey=[已隐藏] 联系 138****5678' });
});
