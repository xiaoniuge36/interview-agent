import type { ModelCredentialView } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import {
  modelCatalogBlocker,
  toCredentialUpdateInput,
  toModelCatalogInput,
} from './model-credential-form-model';

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

describe('admin model catalog guards', () => {
  it('requires a key for new connections and reuses the saved one when editing', () => {
    const fresh = {
      provider: 'qwen' as const,
      model: '',
      baseUrl: '',
      apiKey: '',
      isDefault: true,
    };
    expect(modelCatalogBlocker(fresh, null)).toContain('API Key');
    expect(modelCatalogBlocker(fresh, 'credential-1')).toBeNull();
  });

  it('requires the custom endpoint URL and a plausible key before calling the provider', () => {
    const custom = {
      provider: 'openai_compatible' as const,
      model: '',
      baseUrl: '',
      apiKey: 'sk-one-time-secret',
      isDefault: true,
    };
    expect(modelCatalogBlocker(custom, null)).toContain('Base URL');
    expect(
      modelCatalogBlocker(
        { ...custom, baseUrl: 'https://gateway.example.test/v1', apiKey: 'short' },
        null,
      ),
    ).toContain('至少 8 位');
  });
});

describe('admin model catalog payload', () => {
  it('sends only the fields the form actually provides', () => {
    expect(
      toModelCatalogInput(
        {
          provider: 'deepseek',
          model: '',
          baseUrl: '',
          apiKey: 'sk-one-time-secret',
          isDefault: true,
        },
        null,
      ),
    ).toEqual({ provider: 'deepseek', apiKey: 'sk-one-time-secret' });
    expect(
      toModelCatalogInput(
        {
          provider: 'openai_compatible',
          model: '',
          baseUrl: 'https://gateway.example.test/v1',
          apiKey: '',
          isDefault: true,
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
