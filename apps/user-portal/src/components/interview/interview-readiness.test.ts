import type { ModelCredentialView } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { hasUsableInterviewModel } from './interview-readiness';

function credential(status: ModelCredentialView['status'], isDefault: boolean) {
  return { status, isDefault } as ModelCredentialView;
}

describe('hasUsableInterviewModel', () => {
  it('accepts only a verified default connection', () => {
    expect(hasUsableInterviewModel([credential('verified', true)])).toBe(true);
    expect(hasUsableInterviewModel([credential('verified', false)])).toBe(false);
    expect(hasUsableInterviewModel([credential('unverified', true)])).toBe(false);
    expect(hasUsableInterviewModel([credential('failed', true)])).toBe(false);
  });
});
