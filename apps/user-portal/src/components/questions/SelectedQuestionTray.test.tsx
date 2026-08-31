import React, { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ClearSelectionDialog, SelectedQuestionTray } from './SelectedQuestionTray';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('SelectedQuestionTray', () => {
  it('有已选题目时提供清空入口但默认不弹确认层', () => {
    const markup = renderTray();

    expect(markup).toContain('清空');
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain('清空已选的');
  });

  it('清空确认层写明数量与不可撤销后果', () => {
    const markup = renderToStaticMarkup(
      createElement(ClearSelectionDialog, {
        selectedCount: 10,
        onCancel: () => undefined,
        onConfirm: () => undefined,
      }),
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('清空已选的 10 道题？');
    expect(markup).toContain('无法撤销');
    expect(markup).toContain('保留题单');
    expect(markup).toContain('清空题单');
    expect(markup).toContain('practice-ai-confirmation-backdrop');
  });
});

function renderTray(overrides: Partial<ComponentProps<typeof SelectedQuestionTray>> = {}) {
  return renderToStaticMarkup(
    createElement(SelectedQuestionTray, {
      selected: [
        { id: 'question-1', title: '缓存失效策略' },
        { id: 'question-2', title: '异常恢复设计' },
      ],
      message: '',
      error: '',
      starting: false,
      onRemove: () => undefined,
      onClear: () => undefined,
      onQuickCompose: () => undefined,
      quickComposeDisabled: false,
      onStart: () => undefined,
      ...overrides,
    }),
  );
}
