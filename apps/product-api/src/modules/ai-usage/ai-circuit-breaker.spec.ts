import { AiCircuitBreaker } from './ai-circuit-breaker';

const KEY = 'deepseek:deepseek-chat:practice_report';

describe('AiCircuitBreaker', () => {
  it('moves from closed to open, allows one half-open probe, then closes on success', () => {
    const breaker = new AiCircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 1_000,
      maxHalfOpenProbes: 1,
    });

    expect(breaker.recordFailure(KEY, 0)).toBe('closed');
    expect(breaker.recordFailure(KEY, 1)).toBe('open');
    expect(breaker.allow(KEY, 500)).toBe(false);
    expect(breaker.allow(KEY, 1_001)).toBe(true);
    expect(breaker.state(KEY)).toBe('half_open');
    expect(breaker.allow(KEY, 1_002)).toBe(false);
    expect(breaker.recordSuccess(KEY)).toBe('closed');
  });

  it('reopens after a failed half-open probe without affecting another model key', () => {
    const breaker = new AiCircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 100,
      maxHalfOpenProbes: 1,
    });

    expect(breaker.recordFailure(KEY, 0)).toBe('open');
    expect(breaker.allow(KEY, 100)).toBe(true);
    expect(breaker.recordFailure(KEY, 101)).toBe('open');
    expect(breaker.allow('qwen:qwen-plus:practice_report', 101)).toBe(true);
  });
});
