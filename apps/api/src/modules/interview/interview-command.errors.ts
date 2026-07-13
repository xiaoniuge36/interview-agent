import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  InterviewCommandResultSchema,
  type InterviewCommandResult,
  type InterviewSession,
} from '@interview-agent/contracts';
import { createHash } from 'node:crypto';
import { mapCommandResult } from './interview.mapper';
import type { ExecuteCommandRequest, StartCommandRequest } from './interview.types';

const COMMAND_IN_PROGRESS_CODE = 'INTERVIEW_COMMAND_IN_PROGRESS';

export function replayExisting(
  existing: Prisma.InterviewCommandGetPayload<object>,
  fingerprint: string,
): InterviewCommandResult {
  assertFingerprint(existing.fingerprint, fingerprint);
  if (existing.status === 'completed') return mapCommandResult(existing.result, true);
  if (existing.status === 'pending') throw commandInProgress();
  throw commandFailed(existing.errorCode);
}

export function startResult(commandId: string, session: InterviewSession): InterviewCommandResult {
  return InterviewCommandResultSchema.parse({
    commandId,
    sessionId: session.id,
    sessionVersion: session.version,
    eventCursor: session.eventSequence,
    replayed: false,
    session,
  });
}

export function startFingerprint(request: StartCommandRequest) {
  return commandFingerprint({ type: 'start', input: request.input });
}

export function executionFingerprint(request: ExecuteCommandRequest) {
  return commandFingerprint({
    type: request.command,
    sessionId: request.sessionId,
    expectedVersion: request.expectedVersion,
    answer: request.answer,
  });
}

export function assertFingerprint(actual: string, expected: string) {
  if (actual === expected) return;
  throw new ConflictException({
    code: 'IDEMPOTENCY_KEY_REUSED',
    message: '同一个 Idempotency-Key 不能用于不同命令。',
  });
}

export function hasActiveLease(value: Date | null) {
  return value !== null && value.getTime() > Date.now();
}

export function commandInProgress() {
  return new ConflictException({
    code: COMMAND_IN_PROGRESS_CODE,
    message: '命令仍在处理中，请使用相同 Idempotency-Key 稍后重试。',
  });
}

export function commandFailed(code: string | null) {
  return new ConflictException({
    code: code ?? 'INTERVIEW_COMMAND_PREVIOUSLY_FAILED',
    message: '该命令此前执行失败，请使用新的 Idempotency-Key 重试。',
  });
}

export function versionConflict() {
  return new ConflictException({
    code: 'INTERVIEW_VERSION_CONFLICT',
    message: '面试会话已被其他请求更新，请刷新后重试。',
  });
}

export function lostCommandLease() {
  return new ConflictException({
    code: 'INTERVIEW_COMMAND_LEASE_LOST',
    message: '命令执行租约已失效，请刷新会话后重试。',
  });
}

function commandFingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
