import type { ModelProvider } from '@interview-agent/contracts';
import { e2eModelStubUrl } from './model-provider-e2e';
import { ModelProviderError } from './model-provider-request';

export const ANTHROPIC_API_VERSION = '2023-06-01';

const DEFAULT_BASE_URLS: Record<Exclude<ModelProvider, 'openai_compatible'>, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

export type ProviderEndpoint = { provider: ModelProvider; baseUrl: string | null };

export function endpointFor(input: ProviderEndpoint) {
  const baseUrl = baseUrlFor(input).replace(/\/$/, '');
  return input.provider === 'anthropic' ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
}

export function modelsEndpointFor(input: ProviderEndpoint) {
  return `${baseUrlFor(input).replace(/\/$/, '')}/models`;
}

export function baseUrlFor(input: ProviderEndpoint) {
  const e2eStubUrl = e2eModelStubUrl();
  if (e2eStubUrl) return e2eStubUrl;
  if (input.baseUrl) return input.baseUrl;
  if (input.provider === 'openai_compatible') {
    throw new ModelProviderError('MODEL_BASE_URL_REQUIRED');
  }
  return DEFAULT_BASE_URLS[input.provider];
}
