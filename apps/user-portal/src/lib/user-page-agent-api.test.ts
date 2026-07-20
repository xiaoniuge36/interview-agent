import { describe, expect, it } from 'vitest';
import { createUserPageAgentCompletionRequest } from './user-page-agent-api';

describe('user page agent API', () => {
  it('targets the user-scoped completion endpoint and preserves the agent body', () => {
    const request = createUserPageAgentCompletionRequest({
      messages: [{ role: 'user', content: '今天练什么' }],
      tools: [],
    });

    expect(request.path).toBe('/user/page-agent/chat/completions');
    expect(request.init?.method).toBe('POST');
    expect(JSON.parse(String(request.init?.body))).toEqual({
      messages: [{ role: 'user', content: '今天练什么' }],
      tools: [],
    });
  });
});
