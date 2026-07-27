import type { PracticeRecommendation } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AgentRecommendationRail } from './AgentRecommendationRail';

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

function renderRail(overrides: Partial<React.ComponentProps<typeof AgentRecommendationRail>> = {}) {
  return renderToStaticMarkup(
    createElement(AgentRecommendationRail, {
      recommendations: [recommendation],
      loading: false,
      error: '',
      actionError: '',
      busyRecommendationId: null,
      onRetry: () => undefined,
      onStart: () => undefined,
      ...overrides,
    }),
  );
}

describe('AgentRecommendationRail', () => {
  it('将推荐训练计划作为首页主操作，并保留自主组题入口', () => {
    const markup = renderRail();

    expect(markup).toContain('今天的训练计划');
    expect(markup).toContain('采用这组题开始练习');
    expect(markup).toContain('自己组一轮');
    expect(markup).toContain('本轮训练依据');
    expect(markup).toContain('系统设计薄弱点强化');
  });

  it('在没有推荐时保留自主组题入口', () => {
    const markup = renderRail({ recommendations: [] });

    expect(markup).toContain('自己组一轮');
  });

  it('在推荐加载失败时保留重试与自主组题入口', () => {
    const markup = renderRail({ recommendations: [], error: '推荐服务暂不可用' });

    expect(markup).toContain('重新获取推荐');
    expect(markup).toContain('自己组一轮');
  });
});
