import { trace, type Attributes } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';

const SERVICE_NAME = 'interview-agent-product-api';
const MAX_ATTRIBUTE_TEXT = 256;
const SENSITIVE_ATTRIBUTE_PARTS = [
  'answer',
  'api_key',
  'apikey',
  'authorization',
  'completion',
  'credential',
  'prompt',
  'secret',
  'token',
];

export function startTelemetry(endpoint: string | undefined) {
  if (!endpoint) return null;
  const sdk = new NodeSDK({
    serviceName: SERVICE_NAME,
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
  });
  sdk.start();
  return sdk;
}

export function withTraceSpan<T>(
  name: string,
  attributes: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(SERVICE_NAME);
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(sanitizeSpanAttributes(attributes));
    try {
      return await run();
    } catch (error) {
      if (error instanceof Error) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export function sanitizeSpanAttributes(attributes: Record<string, unknown>): Attributes {
  const sanitized: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (isSensitiveKey(key)) continue;
    if (typeof value === 'string') sanitized[key] = value.slice(0, MAX_ATTRIBUTE_TEXT);
    if (typeof value === 'number' || typeof value === 'boolean') sanitized[key] = value;
  }
  return sanitized;
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase().replaceAll('-', '_');
  return SENSITIVE_ATTRIBUTE_PARTS.some((part) => normalized.includes(part));
}
