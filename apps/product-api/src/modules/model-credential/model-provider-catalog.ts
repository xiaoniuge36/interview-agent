import type { ModelProvider } from '@interview-agent/contracts';
import { ANTHROPIC_API_VERSION } from './model-provider-endpoints';
import { ModelProviderError } from './model-provider-request';

export type ModelCatalogRequest = {
  provider: ModelProvider;
  baseUrl: string | null;
  apiKey: string;
  timeoutMs?: number;
};

export type ModelCatalogEntry = { id: string; label: string };

const MAX_CATALOG_ENTRIES = 500;
const MAX_CATALOG_FIELD_LENGTH = 200;

export function catalogHeaders(input: ModelCatalogRequest): Record<string, string> {
  return input.provider === 'anthropic'
    ? { 'x-api-key': input.apiKey, 'anthropic-version': ANTHROPIC_API_VERSION }
    : { Authorization: `Bearer ${input.apiKey}` };
}

export function parseModelCatalog(payload: unknown): ModelCatalogEntry[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
  }
  const entries = payload.data
    .map(parseCatalogEntry)
    .filter((entry): entry is ModelCatalogEntry => entry !== null);
  const unique = new Map<string, ModelCatalogEntry>();
  for (const entry of entries) if (!unique.has(entry.id)) unique.set(entry.id, entry);
  return [...unique.values()].slice(0, MAX_CATALOG_ENTRIES);
}

function parseCatalogEntry(value: unknown): ModelCatalogEntry | null {
  if (!isRecord(value)) return null;
  const id = catalogField(value.id);
  if (!id) return null;
  return { id, label: catalogField(value.display_name) ?? id };
}

function catalogField(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_CATALOG_FIELD_LENGTH) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
