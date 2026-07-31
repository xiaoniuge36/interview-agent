import { parseRuntimeDecision } from './agent-runtime.response';

test('preserves evidence fields from a valid Runtime response', async () => {
  const response = new Response(
    JSON.stringify({
      contractVersion: 'interview-runtime.v1',
      stage: 'warmup',
      content: 'Introduce a representative project.',
      shouldFinish: false,
      basisSummary: ['Start with project experience.'],
      sourceIds: ['chunk-1'],
    }),
  );

  await expect(parseRuntimeDecision(response, new Set(['chunk-1']))).resolves.toEqual({
    decision: expect.objectContaining({
      basisSummary: ['Start with project experience.'],
      sourceIds: ['chunk-1'],
    }),
  });
});

test('rejects sources that were not included in the Runtime request', async () => {
  const response = new Response(
    JSON.stringify({
      contractVersion: 'interview-runtime.v1',
      stage: 'warmup',
      content: 'Introduce a representative project.',
      shouldFinish: false,
      sourceIds: ['unknown'],
    }),
  );

  await expect(parseRuntimeDecision(response, new Set(['chunk-1']))).resolves.toMatchObject({
    kind: 'schema',
    code: 'AGENT_RUNTIME_SCHEMA_INVALID',
  });
});
