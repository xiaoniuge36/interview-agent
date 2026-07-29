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
  algorithm: 'hybrid',
  category: null,
  estimatedMinutes: 24,
  questionIds: ['question-1', 'question-2', 'question-3'],
  evidence: [
    {
      type: 'mastery',
      sourceId: 'memory-event-1',
      label: '系统设计掌握度 42 分',
      detail: '来自 2 条训练证据，当前趋势下降。',
    },
    {
      type: 'retrieval',
      sourceId: 'chunk-1',
      label: '事务一致性题库',
      detail: '匹配到近期训练薄弱点的公开题目摘要。',
    },
  ],
} satisfies PracticeRecommendation;

describe('QuestionRecommendationBanner', () => {
  it('将推荐训练作为主操作，并保留自主组卷入口', () => {
    const markup = renderBanner(false);

    expect(markup).toContain('今天优先练什么');
    expect(markup).toContain('采用并开始训练');
    expect(markup).toContain('自己组一轮');
    expect(markup).toContain('本轮推荐依据');
    expect(markup).toContain('aria-label="推荐依据"');
    expect(markup).toContain('系统设计掌握度 42 分');
    expect(markup).toContain('来自 2 条训练证据，当前趋势下降。');
    expect(markup).toContain('系统设计薄弱点强化');
    expect(markup).toContain('混合检索推荐');
    expect(markup).toContain('检索来源 · 事务一致性题库');
    expect(markup).toContain('匹配到近期训练薄弱点的公开题目摘要。');
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
