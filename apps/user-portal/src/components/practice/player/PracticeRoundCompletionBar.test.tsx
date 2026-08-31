import type { PracticeSession } from '@interview-agent/contracts';
import React, { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  PracticeAiReportConfirmation,
  PracticeRoundCompletionBar,
  PracticeSelfStudyConfirmation,
} from './PracticeRoundCompletionBar';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeRoundCompletionBar', () => {
  it('将整轮操作呈现为独立的 STEP 03 完成步骤', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeRoundCompletionBar, { player: completedPlayer() }),
    );

    expect(markup).toContain('practice-round-completion-step');
    expect(markup).toContain('STEP 03 · 完成本轮');
    expect(markup).toContain('生成整轮 AI 复盘');
    expect(markup).toContain('仅保留回答并结束');
  });

  it('使用与单题评价一致的正式模型调用确认层', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeAiReportConfirmation, {
        pendingCount: 2,
        onCancel: () => undefined,
        onConfirm: () => undefined,
      }),
    );

    expect(markup).toContain('practice-ai-confirmation-backdrop');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('确认生成整轮 AI 复盘');
    expect(markup).toContain('自动评价 2 题');
    expect(markup).toContain('生成整轮总结');
    expect(markup).toContain('更新能力画像');
    expect(markup).toContain('使用我的模型生成复盘');
  });

  it('仅保留回答并结束需要先确认并写清不生成 AI 评价', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeSelfStudyConfirmation, {
        onCancel: () => undefined,
        onConfirm: () => undefined,
      }),
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('确认仅保留回答并结束？');
    expect(markup).toContain('本轮将不生成 AI 评价');
    expect(markup).toContain('不更新能力画像');
    expect(markup).toContain('暂不结束');
    expect(markup).toContain('仅保留回答并结束');
  });
});

function completedPlayer(): ComponentProps<typeof PracticeRoundCompletionBar>['player'] {
  return {
    session: session(),
    busy: null,
    completeSelfStudy: async () => undefined,
    submitAiReport: async () => undefined,
  } as unknown as ComponentProps<typeof PracticeRoundCompletionBar>['player'];
}

function session(): PracticeSession {
  return {
    id: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    jobIntentId: null,
    sourceInterviewSessionId: null,
    title: '专项训练',
    mode: 'manual',
    status: 'in_progress',
    startedAt: '2026-07-23T00:00:00.000Z',
    submittedAt: null,
    reportedAt: null,
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
    items: [item('item-1', 1), item('item-2', 2)],
  };
}

function item(id: string, sequence: number): PracticeSession['items'][number] {
  return {
    id,
    sequence,
    status: 'answered',
    answer: '已经保存的回答',
    answeredAt: '2026-07-23T00:00:00.000Z',
    evaluation: null,
    question: {
      id: `question-${sequence}`,
      tenantId: 'public',
      visibility: 'public',
      title: '系统设计题',
      stem: '请说明设计思路。',
      type: 'system_design',
      difficulty: 'medium',
      tags: ['系统设计'],
      sourceRefs: [],
      status: 'published',
    },
  };
}
