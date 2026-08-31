import type { PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { usePracticePlayer } from './usePracticePlayer';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type PlayerValue = ReturnType<typeof usePracticePlayer>;

const playerState = vi.hoisted(() => ({ value: null as unknown }));

vi.mock('./usePracticePlayer', () => ({
  usePracticePlayer: () => playerState.value,
}));

vi.mock('./PracticeQuestionStage', () => ({
  PracticeQuestionStage: () => <div>作答区</div>,
}));

vi.mock('./PracticeCoachPanel', () => ({
  PracticeCoachPanel: () => <div>反馈区</div>,
}));

const { PracticePlayer } = await import('./PracticePlayer');

describe('PracticePlayer 进行中', () => {
  it('默认返回链接指向题库', () => {
    playerState.value = player();

    const markup = renderToStaticMarkup(createElement(PracticePlayer));

    expect(markup).toContain('href="/questions"');
    expect(markup).toContain('← 返回题库');
  });

  it('错题本来源时返回链接与文案指向错题本', () => {
    playerState.value = player({ returnOrigin: 'mistake-book' });

    const markup = renderToStaticMarkup(createElement(PracticePlayer));

    expect(markup).toContain('href="/reports#mistake-book-heading"');
    expect(markup).toContain('← 返回错题本');
    expect(markup).not.toContain('← 返回题库');
  });

  it('全部题已作答时作答步也显示完成本轮入口', () => {
    playerState.value = player({ allAnswered: true });

    const markup = renderToStaticMarkup(createElement(PracticePlayer));

    expect(markup).toContain('作答区');
    expect(markup).toContain('practice-round-completion-step');
    expect(markup).toContain('STEP 03 · 完成本轮');
    expect(markup).toContain('生成整轮 AI 复盘');
  });

  it('还有未作答题目时不显示完成本轮入口', () => {
    playerState.value = player();

    const markup = renderToStaticMarkup(createElement(PracticePlayer));

    expect(markup).not.toContain('practice-round-completion-step');
  });
});

function player({
  returnOrigin = null,
  allAnswered = false,
}: {
  returnOrigin?: PlayerValue['returnOrigin'];
  allAnswered?: boolean;
} = {}): PlayerValue {
  return {
    sessionId: 'session-1',
    returnOrigin,
    session: session(allAnswered),
    drafts: {},
    solutions: {},
    report: null,
    mastery: [],
    currentIndex: 0,
    loading: false,
    loadError: '',
    busy: null,
    issue: null,
    message: '',
    aiOperation: null,
    reload: async () => false,
    setCurrentIndex: () => undefined,
    updateDraft: () => undefined,
    save: async () => false,
    revealSolution: async () => undefined,
    evaluate: async () => undefined,
    submitAiReport: async () => undefined,
    completeSelfStudy: async () => undefined,
    startNextRecommendation: async () => undefined,
    startingNextRecommendation: false,
    startWeaknessReview: async () => undefined,
    startingWeaknessReview: false,
  } as unknown as PlayerValue;
}

function session(allAnswered: boolean): PracticeSession {
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
    items: [
      item('item-1', 1, '第一题的回答'),
      item('item-2', 2, allAnswered ? '第二题的回答' : null),
    ],
  };
}

function item(
  id: string,
  sequence: number,
  answer: string | null,
): PracticeSession['items'][number] {
  return {
    id,
    sequence,
    status: answer ? 'answered' : 'pending',
    answer,
    answeredAt: answer ? '2026-07-23T00:00:00.000Z' : null,
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
