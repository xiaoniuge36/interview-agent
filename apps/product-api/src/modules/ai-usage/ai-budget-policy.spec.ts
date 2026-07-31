import { AiBudgetPolicy } from './ai-budget-policy';

describe('AiBudgetPolicy', () => {
  it('rejects oversized report input with a stable code', () => {
    const policy = new AiBudgetPolicy();

    expect(policy.check({ operation: 'practice_report', inputCharacters: 12_001 })).toEqual({
      allowed: false,
      code: 'AI_BUDGET_EXHAUSTED',
    });
  });

  it('returns server-owned limits for an allowed operation', () => {
    const policy = new AiBudgetPolicy();

    expect(policy.check({ operation: 'practice_report', inputCharacters: 12_000 })).toEqual({
      allowed: true,
      code: null,
      budget: {
        maxInputCharacters: 12_000,
        maxOutputTokens: 1_400,
        maxAttempts: 2,
        timeoutMs: 30_000,
      },
    });
  });
});
