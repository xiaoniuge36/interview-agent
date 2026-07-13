import { PracticeEvaluator } from './practice-evaluator';

const rubric = [
  { point: 'Core concept', score: 40, description: 'Explain retrieval and generation.' },
  { point: 'Trade-offs', score: 60, description: 'Describe latency and grounding trade-offs.' },
];

describe('PracticeEvaluator', () => {
  it('returns a deterministic evaluation with rubric feedback', () => {
    const evaluation = new PracticeEvaluator().evaluate({
      answer:
        'Retrieval brings grounded context to generation. It improves grounding but adds latency and retrieval cost.',
      referenceAnswer:
        'Retrieval augmented generation combines retrieval, grounded context, generation, latency, and cost.',
      rubric,
      tags: ['RAG'],
    });

    expect(evaluation.score).toBeGreaterThan(20);
    expect(evaluation.rubricScores).toHaveLength(2);
    expect(evaluation.feedback).toBeTruthy();
  });

  it('marks missing rubric points for a short unsupported answer', () => {
    const evaluation = new PracticeEvaluator().evaluate({
      answer: 'It works.',
      referenceAnswer: 'Retrieval augmented generation combines retrieval and grounded context.',
      rubric,
      tags: ['RAG'],
    });

    expect(evaluation.missingPoints.length).toBeGreaterThan(0);
    expect(evaluation.score).toBeLessThan(50);
  });
});
