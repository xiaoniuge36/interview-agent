import { memoryEventsForPractice } from './practice-memory-events';

test('aggregates practice evaluations into one deterministic observation per tag', () => {
  const events = memoryEventsForPractice({
    session: {
      id: 'session-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      items: [
        { question: { tags: ['system-design'] } },
        { question: { tags: ['system-design', 'database'] } },
      ],
    },
    evaluations: [{ score: 60 }, { score: 80 }],
    traceId: 'trace-0001',
    createdAt: '2026-07-28T00:00:00.000Z',
  });

  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        dedupeKey: 'practice:session-1:system-design',
        observedScore: 70,
        sourceType: 'practice',
      }),
    ]),
  );
});
