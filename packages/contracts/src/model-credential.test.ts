import {
  CreateModelCredentialInputSchema,
  ModelCredentialViewSchema,
  UpdateModelCredentialInputSchema,
} from './schemas/model-credential';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('用户模型凭证要求一次性提交 API Key，读取视图不包含明文', () => {
  assert.equal(
    CreateModelCredentialInputSchema.safeParse({
      provider: 'openai',
      model: 'gpt-4.1',
    }).success,
    false,
  );

  const view = ModelCredentialViewSchema.parse({
    id: 'credential-1',
    provider: 'openai',
    model: 'gpt-4.1',
    baseUrl: null,
    keyHint: '••••7K9m',
    status: 'verified',
    isDefault: true,
    lastTestedAt: '2026-07-15T00:00:00.000Z',
    lastErrorCode: null,
    updatedAt: '2026-07-15T00:00:00.000Z',
  });

  assert.equal('apiKey' in view, false);
  assert.equal(JSON.stringify(view).includes('sk-'), false);
});

test('自定义兼容端点拒绝不安全的 HTTP 地址', () => {
  const parsed = CreateModelCredentialInputSchema.safeParse({
    provider: 'openai_compatible',
    model: 'custom-chat',
    apiKey: 'sk-real-secret',
    baseUrl: 'http://internal-service.test/v1',
  });

  assert.equal(parsed.success, false);
});

test('自定义兼容端点拒绝本机、私网和内嵌凭证地址', () => {
  for (const baseUrl of [
    'https://localhost/v1',
    'https://[::1]/v1',
    'https://[::7f00:1]/v1',
    'https://[2001:db8::1]/v1',
    'https://[::ffff:127.0.0.1]/v1',
    'https://[fe80::1]/v1',
    'https://[fd00::1]/v1',
    'https://[ff02::1]/v1',
    'https://127.0.0.1/v1',
    'https://10.0.0.1/v1',
    'https://169.254.169.254/latest/meta-data',
    'https://192.168.1.10/v1',
    'https://192.0.2.10/v1',
    'https://192.0.0.10/v1',
    'https://192.88.99.10/v1',
    'https://198.51.100.10/v1',
    'https://203.0.113.10/v1',
    'https://user:password@example.com/v1',
    '//model.example.test/v1',
    'https://model.example.test:0/v1',
  ]) {
    assert.equal(
      CreateModelCredentialInputSchema.safeParse({
        provider: 'openai_compatible',
        model: 'private-model',
        apiKey: 'sk-one-time-secret',
        baseUrl,
      }).success,
      false,
    );
  }
});

test('自定义兼容端点允许普通公网 HTTPS 地址', () => {
  assert.equal(
    CreateModelCredentialInputSchema.safeParse({
      provider: 'openai_compatible',
      model: 'public-model',
      apiKey: 'sk-one-time-secret',
      baseUrl: 'https://model.example.test:8443/v1',
    }).success,
    true,
  );
});

test('编辑模型连接时支持服务商切换且兼容端点必须同时更新 Base URL', () => {
  const missingBaseUrl = UpdateModelCredentialInputSchema.safeParse({
    provider: 'openai_compatible',
    model: 'custom-chat',
  });
  const providerUpdate = UpdateModelCredentialInputSchema.safeParse({
    provider: 'qwen',
    model: 'qwen-plus',
  });

  assert.equal(missingBaseUrl.success, false);
  assert.equal(providerUpdate.success, true);
  assert.equal(
    providerUpdate.success ? (providerUpdate.data as { provider?: string }).provider : undefined,
    'qwen',
  );
});
