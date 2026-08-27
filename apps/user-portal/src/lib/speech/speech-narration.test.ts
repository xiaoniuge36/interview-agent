import type { InterviewTurn } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { interviewerTurnIds, nextNarrationTurn } from './speech-narration';

function turn(id: string, role: InterviewTurn['role']): InterviewTurn {
  return {
    id,
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    commandId: `command-${id}`,
    role,
    stage: 'tech_basics',
    content: `${role} 内容 ${id}`,
    traceId: 'trace-1234567890',
    createdAt: '2026-08-27T10:00:00.000Z',
  };
}

describe('nextNarrationTurn', () => {
  it('新会话的第一条面试官消息会被朗读', () => {
    const turns = [turn('t1', 'interviewer')];

    expect(nextNarrationTurn(turns, 0, new Set())?.id).toBe('t1');
  });

  it('恢复历史会话的首次填充不补读旧消息', () => {
    const turns = [turn('t1', 'interviewer'), turn('t2', 'candidate'), turn('t3', 'interviewer')];

    expect(nextNarrationTurn(turns, 0, new Set())).toBeNull();
  });

  it('提交回答后落地的追问会被朗读', () => {
    const turns = [turn('t1', 'interviewer'), turn('t2', 'candidate'), turn('t3', 'interviewer')];

    expect(nextNarrationTurn(turns, 1, new Set(['t1']))?.id).toBe('t3');
  });

  it('最新一条是候选人消息时没有新问题可读', () => {
    const turns = [turn('t1', 'interviewer'), turn('t2', 'candidate')];

    expect(nextNarrationTurn(turns, 1, new Set(['t1']))).toBeNull();
  });

  it('已读过的消息不会重复朗读', () => {
    const turns = [turn('t1', 'interviewer')];

    expect(nextNarrationTurn(turns, 1, new Set(['t1']))).toBeNull();
  });
});

describe('interviewerTurnIds', () => {
  it('只收集面试官消息的 id', () => {
    const turns = [turn('t1', 'interviewer'), turn('t2', 'candidate'), turn('t3', 'interviewer')];

    expect(interviewerTurnIds(turns)).toEqual(['t1', 't3']);
  });
});
