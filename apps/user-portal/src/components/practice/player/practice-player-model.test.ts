import { describe, expect, it } from 'vitest';
import type { PracticeSession } from '@interview-agent/contracts';
import {
  canCompleteSelfStudy,
  canSubmitAiReport,
  confirmPracticeNavigation,
  hasUnsavedPracticeAnswer,
  initialPracticeItemIndex,
  pendingEvaluationCount,
  practiceEvidence,
  practiceProgress,
  practiceRecoveryMessage,
  requiresAiReportConfirmation,
  restorePracticeWorkspace,
} from './practice-player-model';

describe('单题播放器状态', () => {
  it('刷新后定位第一道未评价题', () => {
    expect(initialPracticeItemIndex(session())).toBe(1);
  });

  it('分别计算保存和评价进度', () => {
    expect(practiceProgress(session())).toEqual({ answered: 2, evaluated: 1, total: 3 });
  });

  it('答案全部保存但部分题目未评价时允许发起整轮复盘', () => {
    expect(canCompleteSelfStudy(session())).toBe(false);
    expect(canSubmitAiReport(session())).toBe(false);
    const completeAnswers = session({ answerAll: true });
    expect(canCompleteSelfStudy(completeAnswers)).toBe(true);
    expect(canSubmitAiReport(completeAnswers)).toBe(true);
    expect(pendingEvaluationCount(completeAnswers)).toBe(2);
  });

  it('已保存答案中只统计尚未评价的题目', () => {
    expect(pendingEvaluationCount(session())).toBe(1);
    expect(pendingEvaluationCount(session({ answerAll: true, evaluateAll: true }))).toBe(0);
  });

  it('有待评价题目时需要在页面内确认 AI 复盘', () => {
    expect(requiresAiReportConfirmation(session({ answerAll: true }))).toBe(true);
  });

  it('题目均已评价时不需要重复确认', () => {
    expect(requiresAiReportConfirmation(session({ answerAll: true, evaluateAll: true }))).toBe(
      false,
    );
  });

  it('识别当前草稿是否已经保存到服务端', () => {
    const item = session().items[1]!;

    expect(hasUnsavedPracticeAnswer(item, 'answer-2')).toBe(false);
    expect(hasUnsavedPracticeAnswer(item, 'answer-2 补充内容')).toBe(true);
  });

  it('存在未保存修改时返回可解释的页面内切题确认', () => {
    expect(confirmPracticeNavigation(session().items[1]!, '新草稿')).toEqual({
      cancelLabel: '留在本题',
      confirmLabel: '保留草稿并切换',
      description: '当前修改只保存在这个标签页，切换后仍可回来继续编辑。',
      title: '保留这段草稿再切换？',
    });
  });
});

describe('刷题本地恢复', () => {
  it('只恢复本轮真实题目的未保存差异和合法题号', () => {
    const restored = restorePracticeWorkspace(session(), {
      drafts: {
        'item-1': 'answer-1',
        'item-2': 'answer-2 的未保存补充',
        'unknown-item': '不可信草稿',
      },
      currentIndex: 2,
    });

    expect(restored).toEqual({
      drafts: {
        'item-1': 'answer-1',
        'item-2': 'answer-2 的未保存补充',
        'item-3': '',
      },
      currentIndex: 2,
      recoveredDraftCount: 1,
    });
  });

  it('本地题号越界时仍定位第一道未评价题', () => {
    expect(restorePracticeWorkspace(session(), { drafts: {}, currentIndex: 99 }).currentIndex).toBe(
      1,
    );
  });

  it('空白本地值不能覆盖服务端已保存答案', () => {
    const restored = restorePracticeWorkspace(session(), {
      drafts: { 'item-1': '   ' },
      currentIndex: null,
    });

    expect(restored.drafts['item-1']).toBe('answer-1');
    expect(restored.recoveredDraftCount).toBe(0);
  });

  it('只在确实恢复未保存回答时显示提示', () => {
    expect(practiceRecoveryMessage(1)).toBe('已恢复当前标签页内未保存的回答。');
    expect(practiceRecoveryMessage(0)).toBe('');
  });

  it('已完成练习不再恢复过期本地草稿', () => {
    const restored = restorePracticeWorkspace(session({ status: 'report_ready' }), {
      drafts: { 'item-2': '过期草稿' },
      currentIndex: 2,
    });

    expect(restored.drafts['item-2']).toBe('answer-2');
    expect(restored.recoveredDraftCount).toBe(0);
  });
});

describe('训练证据摘要', () => {
  it('将练习进度归纳为真实的训练证据状态', () => {
    expect(practiceEvidence(session())).toEqual({
      answered: 2,
      evaluated: 1,
      total: 3,
      pending: 2,
      profileState: 'awaiting_report',
    });
    expect(practiceEvidence(session({ status: 'report_ready', evaluateAll: true }))).toMatchObject({
      profileState: 'updated',
    });
    expect(practiceEvidence(session({ status: 'submitted' }))).toMatchObject({
      profileState: 'preserved',
    });
  });
});

function session(
  options: {
    answerAll?: boolean;
    evaluateAll?: boolean;
    status?: PracticeSession['status'];
  } = {},
): PracticeSession {
  return {
    id: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    jobIntentId: null,
    sourceInterviewSessionId: null,
    mode: 'manual',
    title: '系统设计强化',
    status: options.status ?? 'in_progress',
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
