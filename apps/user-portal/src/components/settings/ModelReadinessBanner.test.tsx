import type { ModelCredentialView } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModelReadinessBanner } from './ModelReadinessBanner';
import { parseSettingsReturnTarget } from './settings-return-target';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('ModelReadinessBanner', () => {
  it('stays silent when no connection exists: the empty-state card owns that guidance', () => {
    expect(render([])).toBe('');
  });

  it('distinguishes a verified default from a connection that still needs action', () => {
    const readyMarkup = render([credential()]);
    const needsActionMarkup = render([credential({ status: 'failed' })]);

    expect(readyMarkup).toContain('默认模型已就绪');
    expect(readyMarkup).toContain('可用于 AI 评价和模拟面试');
    expect(readyMarkup).toContain('href="/questions"');
    expect(readyMarkup).toContain('返回题库继续组卷');
    expect(needsActionMarkup).toContain('还需要完成一项检查');
    expect(needsActionMarkup).not.toContain('返回题库继续组卷');
  });

  it('offers a return to the originating practice after the model is ready', () => {
    const markup = render(
      [credential()],
      parseSettingsReturnTarget('/practice?session=session-123'),
    );

    expect(markup).toContain('href="/practice?session=session-123"');
    expect(markup).toContain('返回本轮练习');
    expect(markup).not.toContain('返回题库继续组卷');
  });

  it('offers a return to the originating interview after the model is ready', () => {
    const markup = render(
      [credential()],
      parseSettingsReturnTarget('/interview?session=interview-123'),
    );

    expect(markup).toContain('href="/interview?session=interview-123"');
    expect(markup).toContain('返回本轮面试');
    expect(markup).not.toContain('返回本轮练习');
    expect(markup).not.toContain('返回题库继续组卷');
  });
});

function render(
  credentials: ModelCredentialView[],
  returnTarget = null as ReturnType<typeof parseSettingsReturnTarget>,
) {
  return renderToStaticMarkup(createElement(ModelReadinessBanner, { credentials, returnTarget }));
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
