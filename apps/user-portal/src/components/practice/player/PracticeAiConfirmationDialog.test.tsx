import React, { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeAiConfirmationDialog } from './PracticeAiConfirmationDialog';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeAiConfirmationDialog', () => {
  it('以模态对话框语义呈现确认内容', () => {
    const markup = render();

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="dialog-title"');
    expect(markup).toContain('确认生成 AI 评价');
    expect(markup).toContain('暂不评价');
    expect(markup).toContain('开始评价');
    expect(markup).toContain('>AI<');
  });

  it('支持覆盖头部符号以复用到非 AI 调用的确认场景', () => {
    const markup = render({ glyph: '存' });

    expect(markup).toContain('>存<');
    expect(markup).not.toContain('>AI<');
  });
});

function render(overrides: Partial<ComponentProps<typeof PracticeAiConfirmationDialog>> = {}) {
  return renderToStaticMarkup(
    createElement(PracticeAiConfirmationDialog, {
      titleId: 'dialog-title',
      eyebrow: '模型调用确认',
      title: '确认生成 AI 评价',
      copy: '将调用一次默认模型。',
      benefits: ['本题评分'],
      securityNote: 'API Key 仅在本次调用期间解密。',
      cancelLabel: '暂不评价',
      confirmLabel: '开始评价',
      onCancel: () => undefined,
      onConfirm: () => undefined,
      ...overrides,
    }),
  );
}
