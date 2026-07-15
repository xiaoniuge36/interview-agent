import { describe, expect, it } from 'vitest';
import { canPublishCandidate } from './training-utils';

describe('canPublishCandidate', () => {
  it('only allows approved candidate questions to be published', () => {
    expect(canPublishCandidate('approved')).toBe(true);
    expect(canPublishCandidate('pending')).toBe(false);
    expect(canPublishCandidate('needs_edit')).toBe(false);
    expect(canPublishCandidate('rejected')).toBe(false);
  });
});
