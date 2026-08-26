import { expect, it } from 'vitest';
import { createPageAgentConversationRequests, createPageAgentRunRequests } from './requests';
import {
  loadCurrentPageAgentRunHistory,
  resolvePageAgentRunCompletion,
  shouldPollPageAgentRun,
  shouldRefreshPageAgentRun,
} from './run-recovery-model';
import { persistPageAgentPositionSafely } from './use-page-agent-drag';
import type { PageAgentRun } from '@interview-agent/contracts';

const USER_BASE = '/user/page-agent';
const ADMIN_BASE = '/admin/page-agent';

function runFixture(overrides: Partial<PageAgentRun> = {}): PageAgentRun {
  return {
    id: 'run-1',
    conversationId: 'conversation-1',
    retryOfRunId: null,
    prompt: '整理页面重点',
    status: 'running',
    currentStep: null,
    tokenCount: 0,
    traceId: 'trace-1',
    errorCode: null,
    errorSummary: null,
    startedAt: '2026-08-25T08:00:00.000Z',
    finishedAt: null,
    heartbeatAt: '2026-08-25T08:00:15.000Z',
    updatedAt: '2026-08-25T08:00:15.000Z',
    ...overrides,
  };
}

it('builds conversation request paths with the given prefix and encodes ids', () => {
  const requests = createPageAgentConversationRequests(USER_BASE);
  expect(requests.list().path).toBe('/user/page-agent/conversations');
  expect(requests.get('id/with slash').path).toBe(
    '/user/page-agent/conversations/id%2Fwith%20slash',
  );
  expect(requests.rename('c-1', '新标题').init).toMatchObject({ method: 'PATCH' });
  expect(requests.remove('c-1').init).toMatchObject({ method: 'DELETE' });
  expect(
    JSON.parse(requests.appendMessages('c-1', [{ role: 'user', content: '你好' }]).init.body),
  ).toEqual({ messages: [{ role: 'user', content: '你好' }] });
  expect(JSON.parse(requests.create().init.body)).toEqual({});
  expect(JSON.parse(requests.create('标题').init.body)).toEqual({ title: '标题' });
});

it('builds run request paths for both role prefixes', () => {
  const requests = createPageAgentRunRequests(ADMIN_BASE);
  expect(requests.latest('c-1').path).toBe('/admin/page-agent/conversations/c-1/runs/latest');
  expect(requests.history('c-1').path).toBe('/admin/page-agent/conversations/c-1/runs');
  expect(requests.heartbeat('r-1', { status: 'running' }).path).toBe(
    '/admin/page-agent/runs/r-1/heartbeat',
  );
  expect(requests.complete('r-1', { status: 'succeeded' }).init).toMatchObject({ method: 'POST' });
  const createBody = JSON.parse(
    requests.create('c-1', { prompt: '查看告警', clientRequestId: 'client-1' }).init.body,
  );
  expect(createBody).toEqual({ prompt: '查看告警', clientRequestId: 'client-1' });
});

it('parses run payloads against the shared contract schema', () => {
  const requests = createPageAgentRunRequests(USER_BASE);
  const parsed = requests.history('c-1').schema.safeParse([runFixture()]);
  expect(parsed.success).toBe(true);
  expect(requests.latest('c-1').schema.safeParse(null).success).toBe(true);
});

it('polls only remote active runs and refreshes on errors', () => {
  const activeRemote = runFixture({ id: 'run-remote', status: 'waiting_confirmation' });
  expect(shouldPollPageAgentRun(activeRemote, 'run-local')).toBe(true);
  expect(shouldPollPageAgentRun(activeRemote, 'run-remote')).toBe(false);
  expect(shouldPollPageAgentRun(runFixture({ status: 'succeeded' }), null)).toBe(false);
  expect(shouldRefreshPageAgentRun(null, null, '出错了')).toBe(true);
  expect(shouldRefreshPageAgentRun(null, null, null)).toBe(false);
});

it('maps completion outcomes with stop-request precedence', () => {
  expect(resolvePageAgentRunCompletion(true, false)).toBe('succeeded');
  expect(resolvePageAgentRunCompletion(false, false)).toBe('failed');
  expect(resolvePageAgentRunCompletion(true, true)).toBe('cancelled');
});

it('drops stale run history when the conversation changed mid-flight', async () => {
  const runs = [runFixture()];
  await expect(
    loadCurrentPageAgentRunHistory(
      'c-1',
      async () => runs,
      () => true,
    ),
  ).resolves.toEqual(runs);
  await expect(
    loadCurrentPageAgentRunHistory(
      'c-1',
      async () => runs,
      () => false,
    ),
  ).resolves.toBeNull();
  await expect(
    loadCurrentPageAgentRunHistory(
      'c-1',
      async () => {
        throw new Error('网络中断');
      },
      () => false,
    ),
  ).resolves.toBeNull();
});

it('persists float positions defensively', () => {
  const writes: Array<[string, string]> = [];
  const ok = persistPageAgentPositionSafely({ right: 24, bottom: 48 }, 'demo.position', () => ({
    setItem: (key: string, value: string) => {
      writes.push([key, value]);
    },
  }));
  expect(ok).toBe(true);
  expect(writes).toEqual([['demo.position', JSON.stringify({ right: 24, bottom: 48 })]]);
  const blocked = persistPageAgentPositionSafely({ right: 1, bottom: 1 }, 'demo.position', () => {
    throw new Error('storage blocked');
  });
  expect(blocked).toBe(false);
});
