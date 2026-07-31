import { EventEmitter } from 'node:events';
import type { ProductRequestContext } from '../../common/context/request-context';
import { InterviewController } from './interview.controller';

type Command = 'advance' | 'answer';

const context: ProductRequestContext = {
  requestId: 'request-12345678',
  traceId: 'trace-12345678',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['interview:advance', 'interview:answer'],
  },
};

describe('InterviewController caller cancellation', () => {
  it.each(['advance', 'answer'] as const)(
    'aborts non-stream %s work on response close',
    async (command) => {
      const fixture = controllerFixture(command);
      const operation = invoke(fixture.controller, { command, response: fixture.response });
      await waitForCall(fixture.action);
      fixture.response.emit('close');

      try {
        expect(fixture.receivedSignal()).toBeDefined();
        expect(fixture.receivedSignal()?.aborted).toBe(true);
        await expect(fixture.outcome(operation)).resolves.toMatchObject({ fulfilled: false });
      } finally {
        fixture.release();
        await fixture.outcome(operation);
      }
      expect(fixture.response.listenerCount('close')).toBe(0);
    },
  );

  it.each(['advance', 'answer'] as const)(
    'does not abort completed non-stream %s work after the response closes',
    async (command) => {
      const fixture = controllerFixture(command, true);

      await invoke(fixture.controller, { command, response: fixture.response });
      fixture.response.emit('close');

      expect(fixture.receivedSignal()).toBeDefined();
      expect(fixture.receivedSignal()?.aborted).toBe(false);
      expect(fixture.response.listenerCount('close')).toBe(0);
    },
  );
});

function controllerFixture(command: Command, completeImmediately = false) {
  const response = Object.assign(new EventEmitter(), { writableEnded: false });
  let signal: AbortSignal | undefined;
  let release!: () => void;
  const action = jest.fn((_request: unknown, nextSignal?: AbortSignal) => {
    signal = nextSignal;
    if (completeImmediately) return Promise.resolve({ commandId: 'command-1' });
    return new Promise((resolve, reject) => {
      release = () => resolve({ commandId: 'command-1' });
      nextSignal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  });
  const service = command === 'advance' ? { advance: action } : { submitAnswer: action };
  const controller = new InterviewController(service as never);
  return {
    action,
    controller,
    response,
    release: () => release(),
    receivedSignal: () => signal,
    outcome: (operation: Promise<unknown>) =>
      operation.then(
        () => ({ fulfilled: true }),
        () => ({ fulfilled: false }),
      ),
  };
}

function invoke(
  controller: InterviewController,
  { command, response }: { command: Command; response: EventEmitter },
) {
  const request = {
    context,
    body:
      command === 'answer'
        ? { expectedVersion: 0, answer: 'candidate answer' }
        : { expectedVersion: 0 },
    header: () => `${command}-12345678`,
    res: response,
  };
  const handler = controller[command].bind(controller) as unknown as (
    request: unknown,
    sessionId: string,
    body: unknown,
  ) => Promise<unknown>;
  return handler(request, 'session-1', request.body);
}

async function waitForCall(mock: jest.Mock) {
  while (!mock.mock.calls.length) await new Promise((resolve) => setImmediate(resolve));
}
