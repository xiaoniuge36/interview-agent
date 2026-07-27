import type { ModelCredentialView } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModelReadinessBanner } from './ModelReadinessBanner';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('ModelReadinessBanner', () => {
  it('explains when no default model is available', () => {
    const markup = render([]);

    expect(markup).toContain('还没有可用的默认模型');
    expect(markup).toContain('添加模型连接');
  });

  it('distinguishes a verified default from a connection that still needs action', () => {
    const readyMarkup = render([credential()]);
    const needsActionMarkup = render([credential({ status: 'failed' })]);

    expect(readyMarkup).toContain('默认模型已就绪');
    expect(readyMarkup).toContain('可用于 AI 评价和模拟面试');
    expect(needsActionMarkup).toContain('还需要完成一项检查');
  });
});

function render(credentials: ModelCredentialView[]) {
  return renderToStaticMarkup(
    createElement(ModelReadinessBanner, { credentials, onAdd: () => undefined }),
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
