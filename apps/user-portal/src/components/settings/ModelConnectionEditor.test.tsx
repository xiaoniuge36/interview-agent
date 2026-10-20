import type { ModelCredentialView } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { ModelConnectionEditor } from './ModelConnectionEditor';
import { emptyModelConnection } from './model-connection-form';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('ModelConnectionEditor model discovery', () => {
  it('offers a discovery action next to the model name instead of requiring manual input', () => {
    const markup = render(null);

    expect(markup).toContain('添加模型连接');
    expect(markup).toContain('模型名称');
    expect(markup).toContain('获取模型');
    expect(markup).toContain('aria-label="模型名称"');
  });

  it('keeps the discovery action available when updating a saved connection', () => {
    const markup = render(credential());

    expect(markup).toContain('更新模型连接');
    expect(markup).toContain('获取模型');
  });

  it('does not render a catalog panel before any discovery request runs', () => {
    const markup = render(null);

    expect(markup).not.toContain('model-catalog');
  });
});

function render(credential: ModelCredentialView | null) {
  return renderToStaticMarkup(
    createElement(
      NotificationProvider,
      null,
      createElement(ModelConnectionEditor, {
        credential,
        initialDraft: credential
          ? {
              provider: credential.provider,
              model: credential.model,
              baseUrl: credential.baseUrl ?? '',
              apiKey: '',
              isDefault: credential.isDefault,
              existing: true,
            }
          : emptyModelConnection(),
        onCancel: () => undefined,
        onSaved: () => undefined,
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
