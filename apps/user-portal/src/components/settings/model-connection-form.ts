import type { ModelProvider } from '@interview-agent/contracts';

export type ModelConnectionDraft = {
  provider: ModelProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault?: boolean;
  existing?: boolean;
};

export type ModelConnectionErrors = Partial<Record<'model' | 'baseUrl' | 'apiKey', string>>;

const MIN_API_KEY_LENGTH = 8;

export const MODEL_PROVIDER_OPTIONS: Array<{ value: ModelProvider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'qwen', label: '通义千问' },
  { value: 'openai_compatible', label: 'OpenAI-compatible 自定义端点' },
];

export function emptyModelConnection(): ModelConnectionDraft {
  return { provider: 'deepseek', model: 'deepseek-chat', baseUrl: '', apiKey: '', isDefault: true };
}

export function validateModelConnection(value: ModelConnectionDraft): ModelConnectionErrors {
  const errors: ModelConnectionErrors = {};
  if (!value.model.trim()) errors.model = '请输入模型名称。';
  if (needsBaseUrl(value) && !validUrl(value.baseUrl)) errors.baseUrl = '请输入有效的 HTTPS Base URL。';
  if (!value.existing && value.apiKey.trim().length < MIN_API_KEY_LENGTH) {
    errors.apiKey = '请输入有效的 API Key。';
  }
  return errors;
}

export function optionalBaseUrl(value: string): string | undefined {
  return value.trim() || undefined;
}

function needsBaseUrl(value: ModelConnectionDraft) {
  return value.provider === 'openai_compatible' || Boolean(value.baseUrl.trim());
}

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
