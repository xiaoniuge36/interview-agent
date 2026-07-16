import { describe, expect, it } from 'vitest';
import type { PracticeSession } from '@interview-agent/contracts';
import {
  canCompleteSelfStudy,
  canSubmitAiReport,
  initialPracticeItemIndex,
  practiceProgress,
} from './practice-player-model';

describe('单题播放器状态', () => {
  it('刷新后定位第一道未评价题', () => {
    expect(initialPracticeItemIndex(session())).toBe(1);
  });

  it('分别计算保存和评价进度', () => {
    expect(practiceProgress(session())).toEqual({ answered: 2, evaluated: 1, total: 3 });
  });

  it('自学完成只要求答案，AI 报告要求每题均有评价', () => {
    expect(canCompleteSelfStudy(session())).toBe(false);
    expect(canSubmitAiReport(session())).toBe(false);
    const complete = session({ answerAll: true, evaluateAll: true });
    expect(canCompleteSelfStudy(complete)).toBe(true);
    expect(canSubmitAiReport(complete)).toBe(true);
  });
});

function session(options: { answerAll?: boolean; evaluateAll?: boolean } = {}): PracticeSession {
  return {
    id: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    jobIntentId: null,
    mode: 'manual',
    title: '系统设计强化',
    status: 'in_progress',
    startedAt: '2026-07-15T00:00:00.000Z',
    submittedAt: null,
    reportedAt: null,
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    items: Array.from({ length: 3 }, (_, index) => ({
      id: `item-${index + 1}`,
      sequence: index + 1,
      status:
        options.evaluateAll || index === 0
          ? ('evaluated' as const)
          : index === 1
            ? ('answered' as const)
            : ('pending' as const),
      answer: options.answerAll || index < 2 ? `answer-${index + 1}` : null,
      answeredAt: options.answerAll || index < 2 ? '2026-07-15T00:00:00.000Z' : null,
      question: question(index),
      evaluation: options.evaluateAll || index === 0 ? evaluation(index) : null,
    })),
  };
}

function question(index: number) {
  return {
    id: `question-${index + 1}`,
    tenantId: 'public',
    visibility: 'public' as const,
    title: `题目 ${index + 1}`,
    stem: '请说明你的判断。',
    type: 'short_answer' as const,
    difficulty: 'medium' as const,
    tags: ['表达'],
    sourceRefs: [],
    status: 'published' as const,
  };
}

function evaluation(index: number) {
  return {
    id: `evaluation-${index + 1}`,
    sessionItemId: `item-${index + 1}`,
    score: 80,
    feedback: '回答较完整。',
    missingPoints: [],
    rubricScores: [],
    followUpQuestion: '请补充一个真实案例。',
    createdAt: '2026-07-15T00:00:00.000Z',
  };
}
