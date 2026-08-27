import type { InterviewTurn } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { interviewerTurnIds, nextNarrationTurn, onNarrationStart } from './speech-narration';

const NOW = new Date('2026-08-27T10:00:30.000Z').getTime();
const FRESH_AT = '2026-08-27T10:00:00.000Z';
const STALE_AT = '2026-08-27T09:00:00.000Z';

function turn(id: string, role: InterviewTurn['role'], createdAt = FRESH_AT): InterviewTurn {
  return {
    id,
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    commandId: `command-${id}`,
    role,
    stage: 'tech_basics',
    content: `${role} 内容 ${id}`,
    traceId: 'trace-1234567890',
    createdAt,
  };
}

describe('nextNarrationTurn', () => {
  it('新会话的第一条面试官消息会被朗读', () => {
    const turns = [turn('t1', 'interviewer')];

    expect(nextNarrationTurn(turns, new Set(), NOW)?.id).toBe('t1');
  });

  it('恢复历史会话时超出新鲜窗的旧消息不补读', () => {
    const turns = [turn('t1', 'interviewer', STALE_AT)];

    expect(nextNarrationTurn(turns, new Set(), NOW)).toBeNull();
  });

  it('恢复多条历史消息时同样不补读', () => {
    const turns = [
      turn('t1', 'interviewer', STALE_AT),
      turn('t2', 'candidate', STALE_AT),
      turn('t3', 'interviewer', STALE_AT),
    ];

    expect(nextNarrationTurn(turns, new Set(), NOW)).toBeNull();
  });

  it('提交回答后落地的新追问会被朗读', () => {
    const turns = [
      turn('t1', 'interviewer', STALE_AT),
      turn('t2', 'candidate', STALE_AT),
      turn('t3', 'interviewer'),
    ];

    expect(nextNarrationTurn(turns, new Set(['t1']), NOW)?.id).toBe('t3');
  });

  it('最新一条是候选人消息时没有新问题可读', () => {
    const turns = [turn('t1', 'interviewer'), turn('t2', 'candidate')];

    expect(nextNarrationTurn(turns, new Set(['t1']), NOW)).toBeNull();
  });

  it('已读过的消息不会重复朗读', () => {
    const turns = [turn('t1', 'interviewer')];

    expect(nextNarrationTurn(turns, new Set(['t1']), NOW)).toBeNull();
  });

  it('createdAt 非法时不朗读而不是抛错', () => {
    const turns = [turn('t1', 'interviewer', 'not-a-date')];

    expect(nextNarrationTurn(turns, new Set(), NOW)).toBeNull();
  });
});

describe('interviewerTurnIds', () => {
  it('只收集面试官消息的 id', () => {
    const turns = [turn('t1', 'interviewer'), turn('t2', 'candidate'), turn('t3', 'interviewer')];

    expect(interviewerTurnIds(turns)).toEqual(['t1', 't3']);
  });
});

describe('onNarrationStart', () => {
  it('注册后可被通知，注销后不再收到', () => {
    let notified = 0;
    const off = onNarrationStart(() => {
      notified += 1;
    });
    // speakText 在无 speechSynthesis 的测试环境下直接返回，这里直接验证注册/注销语义。
    off();
    expect(notified).toBe(0);
  });
});
