import type { MemoryEvent } from '@interview-agent/contracts';

type PracticeMemoryInput = {
  session: {
    id: string;
    tenantId: string;
    userId: string;
    items: Array<{ question: { tags: string[] } }>;
  };
  evaluations: Array<{ score: number }>;
  traceId: string;
  createdAt: string;
};

export function memoryEventsForPractice(input: PracticeMemoryInput): MemoryEvent[] {
  const scores = scoresByTag(input.session.items, input.evaluations);
  return [...scores].map(([tag, values]) => memoryEvent(input, tag, values));
}

function scoresByTag(
  items: PracticeMemoryInput['session']['items'],
  evaluations: PracticeMemoryInput['evaluations'],
) {
  const result = new Map<string, number[]>();
  items.forEach((item, index) => {
    item.question.tags.forEach((tag) =>
      result.set(tag, [...(result.get(tag) ?? []), evaluations[index]!.score]),
    );
  });
  return result;
}

function memoryEvent(input: PracticeMemoryInput, tag: string, scores: number[]): MemoryEvent {
  const observedScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return {
    id: `memory_${input.session.id}_${tag}`,
    tenantId: input.session.tenantId,
    userId: input.session.userId,
    schemaVersion: 1,
    dedupeKey: `practice:${input.session.id}:${tag}`,
    sourceType: 'practice',
    eventType: 'skill_observation',
    sourceId: input.session.id,
    tag,
    observedScore,
    evidence: `本轮练习包含 ${scores.length} 条「${tag}」评价证据。`,
    delta: { traceId: input.traceId, evaluationCount: scores.length },
    confidence: 1,
    traceId: input.traceId,
    createdAt: input.createdAt,
  };
}
