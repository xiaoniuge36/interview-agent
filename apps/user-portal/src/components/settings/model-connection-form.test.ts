import { describe, expect, it } from 'vitest';
import { validateModelConnection } from './model-connection-form';

describe('模型连接表单', () => {
  it('要求自定义兼容端点提供地址和一次性 API Key', () => {
    expect(
      validateModelConnection({
        provider: 'openai_compatible',
        model: 'custom-chat',
        baseUrl: '',
        apiKey: '',
      }),
    ).toMatchObject({ baseUrl: expect.any(String), apiKey: expect.any(String) });
  });

  it('允许已保存连接不重新填写 API Key', () => {
    expect(
      validateModelConnection({
        provider: 'deepseek',
        model: 'deepseek-chat',
        baseUrl: '',
        apiKey: '',
        existing: true,
      }),
    ).toEqual({});
  });
});
