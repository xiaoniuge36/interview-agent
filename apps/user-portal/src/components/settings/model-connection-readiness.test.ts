import type { ModelCredentialView } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { modelConnectionReadiness } from './model-connection-readiness';

describe('modelConnectionReadiness', () => {
  it('derives the training readiness from the default credential only', () => {
    const verifiedDefault = credential();
    const failedDefault = credential({ status: 'failed', lastErrorCode: 'MODEL_UNAVAILABLE' });
    const verifiedNonDefault = credential({ isDefault: false });

    expect(modelConnectionReadiness([])).toEqual({ kind: 'empty', defaultCredential: null });
    expect(modelConnectionReadiness([verifiedDefault])).toEqual({
      kind: 'ready',
      defaultCredential: verifiedDefault,
    });
    expect(modelConnectionReadiness([failedDefault])).toEqual({
      kind: 'needs_action',
      defaultCredential: failedDefault,
    });
    expect(modelConnectionReadiness([verifiedNonDefault])).toEqual({
      kind: 'needs_action',
      defaultCredential: null,
    });
  });
});

export function credential(overrides: Partial<ModelCredentialView> = {}): ModelCredentialView {
  return {
    id: 'credential-1',
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseUrl: null,
    keyHint: '…abcd',
    status: 'verified',
    isDefault: true,
    lastTestedAt: '2026-07-23T00:00:00.000Z',
    lastErrorCode: null,
    updatedAt: '2026-07-23T00:00:00.000Z',
    ...overrides,
  };
}
