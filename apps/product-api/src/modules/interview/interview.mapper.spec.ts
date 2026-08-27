import type { InterviewTurn } from '@interview-agent/contracts';
import { mapSession, orderConversationTurns, type SessionWithTurns } from './interview.mapper';

const BASE_TIME = '2026-07-01T08:00:00.000Z';
const LATER_TIME = '2026-07-01T08:05:00.000Z';

function turn(overrides: Partial<InterviewTurn>): InterviewTurn {
  return {
    id: 'turn_base',
    tenantId: 'tenant-a',
    sessionId: 'session-a',
    commandId: 'command-1',
    role: 'interviewer',
    stage: 'warmup',
    content: '请先介绍你最有代表性的项目。',
    traceId: 'trace-test-0001',
    createdAt: BASE_TIME,
    ...overrides,
  };
}

describe('orderConversationTurns', () => {
  it('keeps the candidate answer before the follow-up written at the same instant', () => {
    const shuffled = [
      turn({ id: 'turn_follow-up', role: 'interviewer', createdAt: LATER_TIME }),
      turn({ id: 'turn_answer', role: 'candidate', createdAt: LATER_TIME, content: '我的回答' }),
      turn({ id: 'turn_opening', role: 'interviewer', createdAt: BASE_TIME }),
    ];

    const ordered = orderConversationTurns(shuffled);

    expect(ordered.map((item) => item.id)).toEqual([
      'turn_opening',
      'turn_answer',
      'turn_follow-up',
    ]);
  });

  it('orders turns primarily by creation time across commands', () => {
    const ordered = orderConversationTurns([
      turn({ id: 'turn_later', createdAt: LATER_TIME }),
      turn({ id: 'turn_earlier', role: 'candidate', createdAt: BASE_TIME, content: '早先回答' }),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(['turn_earlier', 'turn_later']);
  });
});

describe('mapSession', () => {
  it('repairs same-instant answer/follow-up pairs that arrive database-ordered by random id', () => {
    const record = {
      id: 'session-a',
      tenantId: 'tenant-a',
      userId: 'user-a',
      jobIntentId: null,
      status: 'waiting_user',
      stage: 'tech_basics',
      version: 3,
      eventSequence: 6,
      workflowRunId: 'workflow-1',
      title: 'Agent 模拟面试',
      createdAt: new Date(BASE_TIME),
      updatedAt: new Date(LATER_TIME),
      turns: [
        dbTurn({ id: 'turn_a-follow-up', role: 'interviewer', createdAt: new Date(LATER_TIME) }),
        dbTurn({ id: 'turn_z-answer', role: 'candidate', createdAt: new Date(LATER_TIME) }),
        dbTurn({ id: 'turn_opening', role: 'interviewer', createdAt: new Date(BASE_TIME) }),
      ],
    } as unknown as SessionWithTurns;

    const session = mapSession(record);

    expect(session.turns.map((item) => item.id)).toEqual([
      'turn_opening',
      'turn_z-answer',
      'turn_a-follow-up',
    ]);
  });
});

function dbTurn(overrides: { id: string; role: 'interviewer' | 'candidate'; createdAt: Date }) {
  return {
    tenantId: 'tenant-a',
    sessionId: 'session-a',
    commandId: 'command-1',
    stage: 'warmup',
    content: '内容不影响排序断言。',
    structuredPayload: null,
    traceId: 'trace-test-0001',
    ...overrides,
  };
}
