import { trace, type Attributes, type Span } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { isSensitiveField, safeTextPreview } from '../security/sensitive-data';

const SERVICE_NAME = 'interview-agent-product-api';
const MAX_ATTRIBUTE_TEXT = 256;

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
  run: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(SERVICE_NAME);
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(sanitizeSpanAttributes(attributes));
    try {
      return await run(span);
    } catch (error) {
      if (error instanceof Error) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/** 降级日志里的错误标签：只暴露错误类型名，避免 message 携带的敏感内容进日志。 */
export function errorCategory(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

export function sanitizeSpanAttributes(attributes: Record<string, unknown>): Attributes {
  const sanitized: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'retrieval.query_preview' || isSensitiveField(key)) continue;
    if (typeof value === 'string') sanitized[key] = safeTextPreview(value, MAX_ATTRIBUTE_TEXT);
    if (typeof value === 'number' || typeof value === 'boolean') sanitized[key] = value;
  }
  return sanitized;
}
