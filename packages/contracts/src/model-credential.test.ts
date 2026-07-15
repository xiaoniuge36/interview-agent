import {
  CreateModelCredentialInputSchema,
  ModelCredentialViewSchema,
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
