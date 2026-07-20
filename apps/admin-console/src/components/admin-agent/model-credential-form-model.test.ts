import type { ModelCredentialView } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { toCredentialUpdateInput } from './model-credential-form-model';

const credential: ModelCredentialView = {
  id: 'credential-1',
  provider: 'openai',
  model: 'gpt-4.1-mini',
  baseUrl: null,
  keyHint: '••••cret',
  status: 'verified',
  isDefault: true,
  lastTestedAt: '2026-07-20T00:00:00.000Z',
  lastErrorCode: null,
  updatedAt: '2026-07-20T00:00:00.000Z',
};

describe('model credential form payload', () => {
  it('does not submit an empty API Key when editing a connection', () => {
    expect(
      toCredentialUpdateInput(
        { provider: 'openai', model: 'gpt-4.1-mini', baseUrl: '', apiKey: '', isDefault: true },
        credential,
      ),
    ).toBeNull();
  });

  it('submits a replacement API Key only when the user provides one', () => {
    expect(
      toCredentialUpdateInput(
        {
          provider: 'qwen',
          model: 'qwen-plus',
          baseUrl: '',
          apiKey: 'sk-rotated-secret',
          isDefault: false,
        },
        credential,
      ),
    ).toEqual({
      provider: 'qwen',
      model: 'qwen-plus',
      apiKey: 'sk-rotated-secret',
      isDefault: false,
    });
  });
});
