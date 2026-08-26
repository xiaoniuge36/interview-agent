import {
  PAGE_AGENT_REQUEST_TOO_LARGE,
  parsePageAgentCompletion,
  sanitizedPageAgentBody,
} from './page-agent.schemas';

const baseRequest = {
  messages: [{ role: 'user', content: '帮我检查配置' }],
  tools: [{ type: 'function', function: { name: 'done', parameters: {} } }],
};

describe('parsePageAgentCompletion', () => {
  it('rejects an oversized body with the shared sentinel error', () => {
    const oversized = {
      ...baseRequest,
      messages: [{ role: 'user', content: 'a'.repeat(700_001) }],
    };

    expect(() => parsePageAgentCompletion(oversized)).toThrow(PAGE_AGENT_REQUEST_TOO_LARGE);
  });

  it('rejects a body without messages or tools', () => {
    expect(() => parsePageAgentCompletion({ messages: [], tools: [] })).toThrow();
  });
});

describe('sanitizedPageAgentBody', () => {
  it('keeps only allow-listed keys and forces the server-side model', () => {
    const body = sanitizedPageAgentBody(
      parsePageAgentCompletion({
        ...baseRequest,
        model: 'client-chosen-model',
        stream: true,
        temperature: 0.2,
      }),
      'server-model',
    );

    expect(body.model).toBe('server-model');
    expect(body).not.toHaveProperty('stream');
    expect(body.temperature).toBe(0.2);
  });

  it('masks sensitive field names and credential-shaped text in messages', () => {
    const body = sanitizedPageAgentBody(
      parsePageAgentCompletion({
        ...baseRequest,
        messages: [{ role: 'user', content: 'apiKey=sk-secret-value-123456', password: 'x' }],
      }),
      'server-model',
    );

    expect(body.messages).toEqual([
      { role: 'user', content: 'apiKey=[已隐藏]', password: '[已隐藏]' },
    ]);
  });
});
