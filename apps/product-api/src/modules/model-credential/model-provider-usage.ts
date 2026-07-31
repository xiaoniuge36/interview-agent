import type { ModelTokenUsage } from './model-provider-stream';

export function compatibleUsageFromResponse(
  payload: Record<string, unknown>,
): ModelTokenUsage | null {
  const usage = payload.usage;
  if (!isRecord(usage)) return null;
  const promptTokens = numberValue(usage.prompt_tokens);
  const outputTokens = numberValue(usage.completion_tokens);
  const totalTokens = numberValue(usage.total_tokens);
  const promptDetails = isRecord(usage.prompt_tokens_details) ? usage.prompt_tokens_details : {};
  const completionDetails = isRecord(usage.completion_tokens_details)
    ? usage.completion_tokens_details
    : {};
  const cacheReadTokens = numberValue(promptDetails.cached_tokens);
  const reasoningTokens = numberValue(completionDetails.reasoning_tokens);
  const result: ModelTokenUsage = {
    ...(promptTokens === undefined ? {} : { inputTokens: promptTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(cacheReadTokens === undefined ? {} : { cacheReadTokens }),
    ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens }),
  };
  return Object.keys(result).length > 0 ? result : null;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
