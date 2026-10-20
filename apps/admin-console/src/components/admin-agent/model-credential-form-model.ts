import type {
  CreateModelCredentialInput,
  DiscoverAvailableModelsInput,
  ModelCredentialView,
  ModelProvider,
  UpdateModelCredentialInput,
} from '@interview-agent/contracts';

export type ModelCredentialFormValues = {
  provider: ModelProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
};

const MIN_API_KEY_LENGTH = 8;

export function credentialFormInitialValues(
  credential?: ModelCredentialView,
): ModelCredentialFormValues {
  return {
    provider: credential?.provider ?? 'openai_compatible',
    model: credential?.model ?? '',
    baseUrl: credential?.baseUrl ?? '',
    apiKey: '',
    isDefault: credential?.isDefault ?? true,
  };
}

export function toCredentialCreateInput(
  values: ModelCredentialFormValues,
): CreateModelCredentialInput {
  const baseUrl = normalizedBaseUrl(values);
  return {
    provider: values.provider,
    model: values.model.trim(),
    apiKey: values.apiKey.trim(),
    ...(baseUrl ? { baseUrl } : {}),
    isDefault: values.isDefault,
  };
}

export function toCredentialUpdateInput(
  values: ModelCredentialFormValues,
  credential: ModelCredentialView,
): UpdateModelCredentialInput | null {
  const next = normalizedValues(values);
  const input: UpdateModelCredentialInput = {};
  if (next.provider !== credential.provider) input.provider = next.provider;
  if (next.model !== credential.model) input.model = next.model;
  if (next.baseUrl !== credential.baseUrl) input.baseUrl = next.baseUrl;
  if (next.isDefault !== credential.isDefault) input.isDefault = next.isDefault;
  if (next.apiKey) input.apiKey = next.apiKey;
  return Object.keys(input).length ? input : null;
}

/** 读取服务商模型目录前的前置校验：返回阻塞原因，可读取时返回 null。 */
export function modelCatalogBlocker(
  values: ModelCredentialFormValues,
  credentialId: string | null,
): string | null {
  if (values.provider === 'openai_compatible' && !values.baseUrl.trim()) {
    return '请先填写兼容端点 Base URL，再获取模型列表。';
  }
  if (!values.apiKey.trim() && !credentialId) return '请先填写 API Key，再获取模型列表。';
  if (values.apiKey.trim() && values.apiKey.trim().length < MIN_API_KEY_LENGTH) {
    return '请输入有效的 API Key（至少 8 位）。';
  }
  return null;
}

/** 已保存的连接可以只传 credentialId，由服务端复用加密保存的密钥。 */
export function toModelCatalogInput(
  values: ModelCredentialFormValues,
  credentialId: string | null,
): DiscoverAvailableModelsInput {
  const baseUrl = normalizedBaseUrl(values);
  const apiKey = values.apiKey.trim();
  return {
    provider: values.provider,
    ...(baseUrl ? { baseUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
    ...(credentialId ? { credentialId } : {}),
  };
}

function normalizedValues(values: ModelCredentialFormValues) {
  return {
    provider: values.provider,
    model: values.model.trim(),
    baseUrl: normalizedBaseUrl(values),
    apiKey: values.apiKey.trim(),
    isDefault: values.isDefault,
  };
}

function normalizedBaseUrl(values: ModelCredentialFormValues): string | null {
  if (values.provider !== 'openai_compatible') return null;
  return values.baseUrl.trim() || null;
}
