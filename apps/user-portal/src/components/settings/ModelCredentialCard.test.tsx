import type { ModelCredentialView } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { ModelCredentialCard } from './ModelCredentialCard';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('ModelCredentialCard', () => {
  it('makes a failed credential explicit and points to the existing test action', () => {
    const markup = render(credential({ status: 'failed', lastErrorCode: 'MODEL_UNAVAILABLE' }));

    expect(markup).toContain('data-status="failed"');
    expect(markup).toContain('测试连接');
    expect(markup).toContain('需要重新测试后才能用于 Agent 任务');
  });

  it('retains a verified default model as an identifiable card state', () => {
    const markup = render(credential());

    expect(markup).toContain('默认模型');
    expect(markup).toContain('连接正常');
    expect(markup).not.toContain('需要重新测试后才能用于 Agent 任务');
  });
});

function render(credential: ModelCredentialView) {
  return renderToStaticMarkup(
    createElement(
      NotificationProvider,
      null,
      createElement(ModelCredentialCard, {
        credential,
        onRefresh: () => Promise.resolve(true),
        onUpdated: () => undefined,
        onRemoved: () => undefined,
        onEdit: () => undefined,
      }),
    ),
  );
}

function credential(overrides: Partial<ModelCredentialView> = {}): ModelCredentialView {
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
