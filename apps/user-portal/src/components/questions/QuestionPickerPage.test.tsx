import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { focusLearningVerificationWorkspace, QuestionPickerPage } from './QuestionPickerPage';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const searchParamsState = vi.hoisted(() => ({
  value: new URLSearchParams('source=learn&course=01-agent基础与上下文工程&topic=react'),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsState.value,
}));

vi.mock('./QuestionRecommendationBanner', () => ({
  QuestionRecommendationBanner: () => <div>通用 Agent 推荐</div>,
}));

vi.mock('./SelfPickerWorkspace', () => ({
  SelfPickerWorkspace: () => <div id="self-picker-workspace">已加载题库</div>,
}));

vi.mock('./useQuestionPicker', () => ({
  useQuestionPicker: () => ({
    recommendation: null,
    recommendationLoading: false,
    recommendationError: '',
    recommendationStartingId: null,
    selected: [],
    catalog: { items: [{ id: 'react-question' }], total: 1 },
    loading: false,
    error: '',
    reload: vi.fn(),
    reloadRecommendation: vi.fn(),
    startRecommendation: vi.fn(),
    query: {},
  }),
}));

describe('QuestionPickerPage learning verification', () => {
  it('moves keyboard focus to the verified topic workspace only for its fixed anchor', () => {
    const focus = vi.fn();
    const workspace = { focus } as unknown as Pick<HTMLElement, 'focus'>;

    expect(focusLearningVerificationWorkspace('#self-picker-workspace', workspace)).toBe(true);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(focusLearningVerificationWorkspace('#other-workspace', workspace)).toBe(false);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('shows the ReAct source context and a direct objective-question CTA', () => {
    const markup = renderToStaticMarkup(<QuestionPickerPage />);

    expect(markup).toContain('本课客观题验证');
    expect(markup).toContain('Agent 基础与上下文工程');
    expect(markup).toContain('ReAct');
    expect(markup).toContain('查看 ReAct 客观题');
    expect(markup).toContain('href="#self-picker-workspace"');
    expect(markup).not.toContain('通用 Agent 推荐');
  });

  it('shows a safe no-match state instead of a generic catalog for a known unmapped course', () => {
    searchParamsState.value = new URLSearchParams(
      'source=learn&course=04-memory-planning与multi-agent',
    );

    const markup = renderToStaticMarkup(<QuestionPickerPage />);

    expect(markup).toContain('该主题暂无对应题目');
    expect(markup).toContain('返回本课');
    expect(markup).toContain('查看全部题目');
    expect(markup).not.toContain('通用 Agent 推荐');
  });
});
