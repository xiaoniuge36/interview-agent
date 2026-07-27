import type { PracticeRecommendation } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QuestionRecommendationBanner } from './QuestionRecommendationBanner';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const recommendation = {
  id: 'recommendation-1',
  title: '系统设计薄弱点强化',
  reason: '最近两轮复盘中，异常恢复和容量规划仍需要加强。',
  source: 'mastery',
  category: null,
  estimatedMinutes: 24,
  questionIds: ['question-1', 'question-2', 'question-3'],
} satisfies PracticeRecommendation;

describe('QuestionRecommendationBanner', () => {
  it('将推荐训练作为主操作，并保留自主组卷入口', () => {
    const markup = renderBanner(false);

    expect(markup).toContain('今天优先练什么');
    expect(markup).toContain('采用并开始训练');
    expect(markup).toContain('自己组一轮');
    expect(markup).toContain('本轮推荐依据');
    expect(markup).toContain('系统设计薄弱点强化');
  });

  it('仅在 Agent 交接进入题库时说明仍需用户确认创建题单', () => {
    const agentHandoffMarkup = renderBanner(true);
    const standardMarkup = renderBanner(false);

    expect(agentHandoffMarkup).toContain('AI 刷题教练已为你带到推荐训练入口');
    expect(agentHandoffMarkup).toContain('确认采用后才会创建本轮题单');
    expect(standardMarkup).not.toContain('AI 刷题教练已为你带到推荐训练入口');
  });
});

function renderBanner(agentHandoff: boolean) {
  return renderToStaticMarkup(
    createElement(QuestionRecommendationBanner, {
      agentHandoff,
      recommendation,
      loading: false,
      error: '',
      starting: false,
      selfPickerExpanded: false,
      onRetry: () => undefined,
      onStart: () => undefined,
      onOpenSelfPicker: () => undefined,
    }),
  );
}
