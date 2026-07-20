import type {
  CreateModelCredentialInput,
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
