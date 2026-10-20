import { describe, expect, it } from 'vitest';
import { modelCatalogBlocker, modelCatalogInput } from './model-connection-form';

describe('获取模型列表的前置条件', () => {
  it('新建连接要先填写 API Key', () => {
    expect(
      modelCatalogBlocker({ provider: 'deepseek', model: '', baseUrl: '', apiKey: '' }, null),
    ).toContain('API Key');
    expect(
      modelCatalogBlocker(
        { provider: 'deepseek', model: '', baseUrl: '', apiKey: 'sk-one-time-secret' },
        null,
      ),
    ).toBeNull();
  });

  it('已保存的连接复用服务端保存的密钥', () => {
    expect(
      modelCatalogBlocker(
        { provider: 'deepseek', model: '', baseUrl: '', apiKey: '', existing: true },
        'credential-1',
      ),
    ).toBeNull();
  });

  it('自定义兼容端点要先填写 Base URL', () => {
    expect(
      modelCatalogBlocker(
        { provider: 'openai_compatible', model: '', baseUrl: '', apiKey: 'sk-one-time-secret' },
        null,
      ),
    ).toContain('Base URL');
    expect(
      modelCatalogBlocker(
        {
          provider: 'openai_compatible',
          model: '',
          baseUrl: 'http://gateway.test/v1',
          apiKey: 'sk-one-time-secret',
        },
        null,
      ),
    ).toContain('HTTPS');
  });
});

describe('获取模型列表的请求体', () => {
  it('只携带真正填写的字段', () => {
    expect(
      modelCatalogInput(
        { provider: 'deepseek', model: '', baseUrl: '', apiKey: 'sk-one-time-secret' },
        null,
      ),
    ).toEqual({ provider: 'deepseek', apiKey: 'sk-one-time-secret' });
    expect(
      modelCatalogInput(
        {
          provider: 'openai_compatible',
          model: '',
          baseUrl: 'https://gateway.example.test/v1',
          apiKey: '',
          existing: true,
        },
        'credential-1',
      ),
    ).toEqual({
      provider: 'openai_compatible',
      baseUrl: 'https://gateway.example.test/v1',
      credentialId: 'credential-1',
    });
  });
});
