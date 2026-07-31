import { projectMastery } from './memory-projection';

const event = (observedScore: number, confidence = 1) => ({
  id: `event-${observedScore}-${confidence}`,
  observedScore,
  confidence,
  sourceId: 'session-1',
});

describe('projectMastery', () => {
  it('creates a falling profile from a low-score observation', () => {
    expect(projectMastery(null, event(40))).toMatchObject({
      score: 40,
      evidenceCount: 1,
      trend: 'falling',
      lastEvidenceSessionId: 'session-1',
    });
  });

  it('weights low-confidence observations less than high-confidence observations', () => {
    const current = {
      score: 80,
      evidenceCount: 2,
      weightedEvidence: 2,
      lastEvidenceSessionId: 'session-0',
    };

    expect(projectMastery(current, event(20, 0.1)).score).toBeGreaterThan(70);
  });
});
