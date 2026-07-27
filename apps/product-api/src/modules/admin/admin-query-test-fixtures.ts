export function candidateRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'candidate-1',
    importTaskId: 'import-1',
    publishedQuestionId: 'question-1',
    title: 'Schema candidate',
    stem: 'Describe schema validation.',
    status: 'pending',
    qualityScore: 88,
    tags: ['schema'],
    sourceRefs: ['fixture://candidate'],
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    ...overrides,
  };
}
