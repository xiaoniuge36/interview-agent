import type { PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeFeedbackLauncher } from './PracticeFeedbackLauncher';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeFeedbackLauncher', () => {
  it('将右侧窄栏收敛为独立反馈步骤入口', () => {
    const markup = renderLauncher('完整回答', '完整回答');

    expect(markup).toContain('下一步');
    expect(markup).toContain('解析与 AI 评价');
    expect(markup).toContain('进入宽版解析');
    expect(markup).toContain('回答已保存，可以进入');
    expect(markup).not.toContain('practice-solution-content');
    expect(markup).not.toContain('查看标准解析');
  });

  it('未保存回答时禁用反馈步骤入口', () => {
    const markup = renderLauncher(null, '尚未保存');

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('先保存回答，再进入反馈步骤');
  });
});

function renderLauncher(answer: string | null, draft: string) {
  return renderToStaticMarkup(
    createElement(PracticeFeedbackLauncher, {
      item: item(answer),
      draft,
      busy: null,
      onOpen: () => undefined,
    }),
  );
}

function item(answer: string | null): PracticeSession['items'][number] {
  return {
    id: 'item-1',
    sequence: 1,
    status: answer ? 'answered' : 'pending',
    answer,
    answeredAt: answer ? '2026-07-23T00:00:00.000Z' : null,
    evaluation: null,
    question: {
      id: 'question-1',
      tenantId: 'public',
      visibility: 'public',
      title: '缓存失效策略',
      stem: '请说明判断与验证路径。',
      type: 'system_design',
      difficulty: 'medium',
      tags: ['缓存'],
      sourceRefs: [],
      status: 'published',
    },
  };
}
