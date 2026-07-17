import { HttpException } from '@nestjs/common';
import type {
  AiOperationPhase,
  AiOperationStreamEvent,
  InterviewCommandResult,
  PracticeItemFeedback,
} from '@interview-agent/contracts';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { ProductRequestContext } from '../context/request-context';

const HEARTBEAT_INTERVAL_MS = 15_000;
const HTTP_OK = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const NON_RETRYABLE_MODEL_CODES = new Set(['MODEL_PROVIDER_RESPONSE_INVALID']);
const PHASE_LABELS: Record<AiOperationPhase, string> = {
  preparing: '正在连接你的默认模型',
  analyzing: '正在提取本轮回答中的有效信息',
  composing: '正在组织评价或下一轮追问',
  validating: '正在核对模型返回的结构',
  saving: '正在保存本轮结果',
};

export type AiOperationStreamSink = {
  phase: (phase: AiOperationPhase) => void;
  delta: (channel: 'interviewer_content' | 'evaluation_feedback', content: string) => void;
  result: (event: AiOperationResultInput) => void;
  error: (error: AiOperationStreamError) => void;
};

type AiOperationMetadata = {
  operationId: string;
  occurredAt: string;
  traceId: string;
};

export type AiOperationStreamError = {
  code: string;
  message: string;
  requestId: string;
  retryable: boolean;
};

export type AiOperationResultInput =
  | {
      operation: 'interview_next';
      result: InterviewCommandResult;
      basisSummary: string[];
    }
  | { operation: 'practice_evaluation'; result: PracticeItemFeedback };

export function createAiOperationSse(response: Response, context: ProductRequestContext) {
  const operationId = `operation_${randomUUID()}`;
  response.status(HTTP_OK);
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders();
  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();
  const sink: AiOperationStreamSink = {
    phase: (phase) =>
      write(response, {
        ...metadata(context, operationId),
        type: 'phase',
        phase,
        label: PHASE_LABELS[phase],
      }),
    delta: (channel, content) =>
      write(response, { ...metadata(context, operationId), type: 'delta', channel, content }),
    result: (event) => writeResult(response, metadata(context, operationId), event),
    error: (error) =>
      write(response, { ...metadata(context, operationId), type: 'error', ...error }),
  };
  return {
    sink,
    close: () => {
      clearInterval(heartbeat);
      if (!response.writableEnded) response.end();
    },
  };
}

export function streamError(
  error: unknown,
  context: ProductRequestContext,
): AiOperationStreamError {
  if (error instanceof HttpException) {
    const payload = error.getResponse();
    const body =
      typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
    const code = typeof body.code === 'string' ? body.code : 'AI_OPERATION_REJECTED';
    const message =
      typeof body.message === 'string' ? body.message : '本次 AI 操作未完成，请稍后重试。';
    return {
      code,
      message,
      requestId: context.requestId,
      retryable:
        error.getStatus() >= HTTP_INTERNAL_SERVER_ERROR && !NON_RETRYABLE_MODEL_CODES.has(code),
    };
  }
  return {
    code: 'AI_OPERATION_FAILED',
    message: '本次 AI 操作未完成，请稍后重试。',
    requestId: context.requestId,
    retryable: true,
  };
}

function metadata(context: ProductRequestContext, operationId: string): AiOperationMetadata {
  return { operationId, occurredAt: new Date().toISOString(), traceId: context.traceId };
}

function write(response: Response, event: AiOperationStreamEvent): void {
  if (response.writableEnded || response.destroyed) return;
  response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

function writeResult(
  response: Response,
  eventMetadata: AiOperationMetadata,
  event: AiOperationResultInput,
): void {
  if (event.operation === 'interview_next') {
    write(response, { ...eventMetadata, type: 'result', ...event });
    return;
  }
  write(response, { ...eventMetadata, type: 'result', ...event });
}
