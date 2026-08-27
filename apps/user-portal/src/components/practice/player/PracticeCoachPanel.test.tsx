import type { PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeCoachPanel } from './PracticeCoachPanel';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeCoachPanel', () => {
  it('作为独立步骤宽版呈现回答、解析与 AI 评价', () => {
    const markup = renderCoach();

    expect(markup).toContain('STEP 02');
    expect(markup).toContain('解析与 AI 评价');
    expect(markup).toContain('我的回答');
    expect(markup).toContain('结构化阅读');
    expect(markup).toContain('这是已保存的回答。');
    expect(markup).toContain('标准解析');
    expect(markup).toContain('AI 评分与追问');
    expect(markup).toContain('返回修改回答');
    expect(markup).toContain('practice-feedback-stage');
  });

  it('从最后一题进入时显示正式的 AI 调用确认层', () => {
    const markup = renderCoach({ confirmAiOnOpen: true });

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('确认生成本题 AI 评价');
    expect(markup).toContain('本题评分');
    expect(markup).toContain('缺失要点');
    expect(markup).toContain('针对性追问');
    expect(markup).toContain('使用我的模型开始评价');
    expect(markup).toContain('暂不评价');
  });

  it('将评价结果组织为可扫描结论并提供进入下一题的主操作', () => {
    const markup = renderCoach({ evaluated: true, hasNextQuestion: true });

    expect(markup).toContain('整体扎实');
    expect(markup).toContain('评分维度');
    expect(markup).toContain('优先补强');
    expect(markup).toContain('Agent 追问');
    expect(markup).toContain('进入下一题');
  });

  it('模型未连接时把本轮 session 作为安全返回目标带入设置', () => {
    const markup = renderCoach({
      issue: {
        code: 'MODEL_CONNECTION_REQUIRED',
        message: '请先连接并测试模型。',
      },
    });

    expect(markup).toContain('href="/settings?returnTo=%2Fpractice%3Fsession%3Dsession-123"');
    expect(markup).toContain('连接并测试模型');
  });
});

function renderCoach({
  confirmAiOnOpen = false,
  evaluated = false,
  hasNextQuestion = false,
  issue = null,
}: {
  confirmAiOnOpen?: boolean;
  evaluated?: boolean;
  hasNextQuestion?: boolean;
  issue?: { code: string; message: string } | null;
} = {}) {
  return renderToStaticMarkup(
    createElement(PracticeCoachPanel, {
      item: item(evaluated),
      sessionId: 'session-123',
      draft: '这是已保存的回答。',
      solution: undefined,
      busy: null,
      issue,
      aiOperation: null,
      confirmAiOnOpen,
      onRevealSolution: () => undefined,
      onEvaluate: () => undefined,
      onOpenReview: () => undefined,
      onBackToAnswer: () => undefined,
      hasNextQuestion,
      onNextQuestion: () => undefined,
    }),
  );
}

function item(evaluated = false): PracticeSession['items'][number] {
  return {
    id: 'item-1',
    sequence: 5,
    status: 'answered',
    answer: '这是已保存的回答。',
    answeredAt: '2026-07-23T00:00:00.000Z',
    evaluation: evaluated
      ? {
          id: 'evaluation-1',
          sessionItemId: 'item-1',
          score: 82,
          feedback: '回答覆盖了主要判断，但异常恢复仍可更具体。',
          missingPoints: ['说明失败后的补偿与回滚路径'],
          rubricScores: [
            { point: '边界判断', score: 86 },
            { point: '异常恢复', score: 68 },
          ],
          dimensionScores: [
            { dimension: 'structure' as const, score: 84, comment: '先结论后展开，结构完整。' },
            { dimension: 'clarity' as const, score: 70, comment: '补一个具体数字更有说服力。' },
          ],
          improvedAnswer: '示范：先做本地缓存兜底，再逐级降级到静态页。',
          followUpQuestion: '如果缓存回源持续失败，你会如何降级？',
          createdAt: '2026-07-23T00:00:00.000Z',
        }
      : null,
    question: {
      id: 'question-1',
      tenantId: 'public',
      visibility: 'public',
      title: '如何设计稳定的缓存失效策略？',
      stem: '请说明你的判断、取舍与验证路径。',
      type: 'system_design',
      difficulty: 'medium',
      tags: ['缓存', '系统设计'],
      sourceRefs: [],
      status: 'published',
    },
  };
}
