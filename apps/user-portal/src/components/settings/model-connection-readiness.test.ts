import type { ModelCredentialView } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { modelConnectionReadiness } from './model-connection-readiness';
import { parseSettingsReturnTarget } from './settings-return-target';

describe('modelConnectionReadiness', () => {
  it('derives the training readiness from the default credential only', () => {
    const verifiedDefault = credential();
    const failedDefault = credential({ status: 'failed', lastErrorCode: 'MODEL_UNAVAILABLE' });
    const verifiedNonDefault = credential({ isDefault: false });

    expect(modelConnectionReadiness([])).toEqual({ kind: 'empty', defaultCredential: null });
    expect(modelConnectionReadiness([verifiedDefault])).toEqual({
      kind: 'ready',
      defaultCredential: verifiedDefault,
      nextAction: {
        href: '/questions',
        label: '返回题库继续组卷',
        notice: '默认模型已就绪，可以返回题库继续组卷。',
      },
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

  it('returns to the originating practice only for a validated target', () => {
    const target = parseSettingsReturnTarget('/practice?session=session-123');

    expect(modelConnectionReadiness([credential()], target)).toMatchObject({
      kind: 'ready',
      nextAction: {
        href: '/practice?session=session-123',
        label: '返回本轮练习',
        notice: '默认模型已就绪，可以返回本轮练习继续评价。',
      },
    });
    expect(modelConnectionReadiness([credential()], null)).toMatchObject({
      kind: 'ready',
      nextAction: { href: '/questions', label: '返回题库继续组卷' },
    });
  });
});

describe('interview model connection readiness', () => {
  it('returns to the originating interview with interview-specific guidance', () => {
    const target = parseSettingsReturnTarget('/interview?session=interview-123');

    expect(modelConnectionReadiness([credential()], target)).toMatchObject({
      kind: 'ready',
      nextAction: {
        href: '/interview?session=interview-123',
        label: '返回本轮面试',
        notice: '默认模型已就绪，可以返回本轮面试继续作答。',
      },
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
