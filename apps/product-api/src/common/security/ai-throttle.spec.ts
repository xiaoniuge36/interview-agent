import { AdminPageAgentController } from '../../modules/admin/admin-page-agent.controller';
import { InterviewController } from '../../modules/interview/interview.controller';
import { ModelCredentialController } from '../../modules/model-credential/model-credential.controller';
import { PracticeController } from '../../modules/practice/practice.controller';
import { RetrievalController } from '../../modules/retrieval/retrieval.controller';
import { UserPageAgentController } from '../../modules/user-page-agent/user-page-agent.controller';
import { configureAiThrottle } from './ai-throttle';

const LIMIT_KEY = 'THROTTLER:LIMITdefault';
const TTL_KEY = 'THROTTLER:TTLdefault';

// 昂贵 AI 路由清单：新增 LLM/Embedding 接口时必须同步挂 @AiThrottle 并登记在此
const AI_ROUTES: ReadonlyArray<readonly [{ prototype: object }, string]> = [
  [PracticeController, 'evaluate'],
  [PracticeController, 'evaluateStream'],
  [PracticeController, 'submit'],
  [InterviewController, 'start'],
  [InterviewController, 'advance'],
  [InterviewController, 'advanceStream'],
  [InterviewController, 'answer'],
  [InterviewController, 'answerStream'],
  [UserPageAgentController, 'completion'],
  [AdminPageAgentController, 'completion'],
  [RetrievalController, 'search'],
  [ModelCredentialController, 'test'],
];

function routeHandler(controller: { prototype: object }, method: string): object {
  const handler = (controller.prototype as Record<string, unknown>)[method];
  expect(typeof handler).toBe('function');
  return handler as object;
}

test('every expensive AI route carries the dedicated throttle override', () => {
  for (const [controller, method] of AI_ROUTES) {
    const handler = routeHandler(controller, method);
    expect(typeof Reflect.getMetadata(LIMIT_KEY, handler)).toBe('function');
    expect(typeof Reflect.getMetadata(TTL_KEY, handler)).toBe('function');
  }
});

test('resolves the bootstrap-configured environment values at request time', () => {
  configureAiThrottle({ ttl: 45_000, limit: 7 });
  const handler = routeHandler(PracticeController, 'evaluate');
  const limit = Reflect.getMetadata(LIMIT_KEY, handler) as () => number;
  const ttl = Reflect.getMetadata(TTL_KEY, handler) as () => number;
  expect(limit()).toBe(7);
  expect(ttl()).toBe(45_000);
});
