import type { PracticeSession } from '@interview-agent/contracts';
import { ApiError } from '@/lib/api';

const DIFFICULTY_LABELS: Record<string, string> = {
  intro: '入门',
  easy: '基础',
  medium: '进阶',
  hard: '高阶',
  expert: '专家',
};

export function answerDrafts(session: PracticeSession) {
  return Object.fromEntries(session.items.map((item) => [item.id, item.answer ?? '']));
}

export function difficultyLabel(difficulty: string) {
  return DIFFICULTY_LABELS[difficulty] ?? '综合';
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === 'PRACTICE_ROLE_QUESTIONS_UNAVAILABLE') {
    return '当前岗位的训练题正在准备中，请稍后再试或更新目标岗位。';
  }
  return '操作未完成，请稍后重试。';
}
