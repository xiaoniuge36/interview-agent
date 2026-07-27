import { describe, expect, it } from 'vitest';
import type {
  InterviewSession,
  InterviewSessionStatus,
  RecentPracticeSummary,
} from '@interview-agent/contracts';
import { selectTrainingContinuation } from './training-continuation';

describe('首页未完成训练选择', () => {
  it('忽略已结束面试并选择最新活动面试', () => {
    const result = selectTrainingContinuation(null, [
      interview('created-but-not-resumable', 'created', '2026-07-23T13:00:00.000Z'),
      interview('finished', 'report_ready', '2026-07-23T12:00:00.000Z'),
      interview('older-active', 'running', '2026-07-23T10:00:00.000Z'),
      interview('latest-active', 'waiting_user', '2026-07-23T11:00:00.000Z'),
    ]);

    expect(result).toMatchObject({
      kind: 'interview',
      id: 'latest-active',
      href: '/interview?session=latest-active',
      statusLabel: '等待你的回答',
    });
  });

  it('刷题更新时间较新时继续刷题', () => {
    const result = selectTrainingContinuation(practice('2026-07-23T12:00:00.000Z'), [
      interview('active', 'waiting_user', '2026-07-23T11:00:00.000Z'),
    ]);

    expect(result).toMatchObject({
      kind: 'practice',
      href: '/practice?session=practice-1',
      progressPercent: 40,
    });
  });

  it('模拟面试更新时间较新时继续模拟', () => {
    const result = selectTrainingContinuation(practice('2026-07-23T10:00:00.000Z'), [
      interview('active', 'running', '2026-07-23T11:00:00.000Z'),
    ]);

    expect(result).toMatchObject({ kind: 'interview', id: 'active' });
    expect(result?.detail).toContain('基础能力');
  });

  it('更新时间相同时保持首页刷题主轴', () => {
    const updatedAt = '2026-07-23T11:00:00.000Z';

    expect(
      selectTrainingContinuation(practice(updatedAt), [
        interview('active', 'waiting_user', updatedAt),
      ])?.kind,
    ).toBe('practice');
  });

  it('没有活动训练时不显示恢复入口', () => {
    expect(
      selectTrainingContinuation(null, [interview('failed', 'failed', '2026-07-23T11:00:00.000Z')]),
    ).toBeNull();
  });
});

function practice(updatedAt: string): RecentPracticeSummary {
  return {
    id: 'practice-1',
    title: '系统设计练习',
    mode: 'manual',
    status: 'in_progress',
    questionCount: 5,
    answeredCount: 2,
    updatedAt,
  };
}

function interview(
  id: string,
  status: InterviewSessionStatus,
  updatedAt: string,
): InterviewSession {
  return {
    id,
    tenantId: 'tenant-1',
    userId: 'user-1',
    status,
    stage: 'tech_basics',
    version: 1,
    eventSequence: 1,
    workflowRunId: `run-${id}`,
    title: '前端工程师模拟面试',
    turns: [],
    createdAt: '2026-07-23T09:00:00.000Z',
    updatedAt,
  };
}
