import type { PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeEvidenceStrip } from './PracticeEvidenceStrip';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeEvidenceStrip', () => {
  it('说明 AI 复盘已更新能力画像', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeEvidenceStrip, { session: session('report_ready') }),
    );

    expect(markup).toContain('训练证据');
    expect(markup).toContain('已回答');
    expect(markup).toContain('能力画像已更新');
    expect(markup).toContain('下一轮推荐');
  });

  it('说明自主结束时只保留回答', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeEvidenceStrip, { session: session('submitted'), compact: true }),
    );

    expect(markup).toContain('回答已保留');
    expect(markup).toContain('不会更新能力画像');
  });
});

function session(status: PracticeSession['status']): PracticeSession {
  return {
    id: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    jobIntentId: null,
    sourceInterviewSessionId: null,
    mode: 'manual',
    title: '系统设计强化',
    status,
    startedAt: '2026-07-22T00:00:00.000Z',
    submittedAt: null,
    reportedAt: status === 'report_ready' ? '2026-07-22T00:10:00.000Z' : null,
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:10:00.000Z',
    items: [
      {
        id: 'item-1',
        sequence: 1,
        status: 'evaluated',
        answer: '我会先验证边界条件。',
        answeredAt: '2026-07-22T00:01:00.000Z',
        question: {
          id: 'question-1',
          tenantId: 'public',
          visibility: 'public',
          title: '如何处理系统边界？',
          stem: '说明你的判断。',
          type: 'short_answer',
          difficulty: 'medium',
          tags: ['系统设计'],
          sourceRefs: [],
          status: 'published',
        },
        evaluation: {
          id: 'evaluation-1',
          sessionItemId: 'item-1',
          score: 84,
          feedback: '回答完整。',
          missingPoints: [],
          rubricScores: [],
          followUpQuestion: null,
          createdAt: '2026-07-22T00:02:00.000Z',
        },
      },
    ],
  };
}
