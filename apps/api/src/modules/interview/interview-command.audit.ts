import type { AuditEventInput } from '../../common/audit/audit.service';
import type {
  CompleteCommandRequest,
  FailCommandRequest,
  StartCommandRequest,
} from './interview.types';
import type { InterviewSession } from '@interview-agent/contracts';

export function startAuditEvent(
  request: StartCommandRequest,
  session: InterviewSession,
): AuditEventInput {
  return {
    action: 'interview.start',
    resourceType: 'InterviewSession',
    resourceId: session.id,
    stateTransition: { from: 'none', to: 'created', version: session.version },
    metadata: {
      ...(request.input.jobIntentId ? { jobIntentId: request.input.jobIntentId } : {}),
      focusTags: request.input.focusTags,
    },
  };
}

export function completionAuditEvent(request: CompleteCommandRequest): AuditEventInput {
  return {
    action: `interview.${request.preparation.command}`,
    resourceType: 'InterviewSession',
    resourceId: request.preparation.sessionId,
    stateTransition: {
      from: request.preparation.session.status,
      to: request.artifacts.session.status,
      version: request.artifacts.session.version,
    },
    metadata: completionMetadata(request),
  };
}

export function failureAuditEvent(request: FailCommandRequest): AuditEventInput {
  return {
    action: `interview.${request.preparation.command}`,
    resourceType: 'InterviewSession',
    resourceId: request.preparation.sessionId,
    result: 'failure',
    metadata: {
      commandId: request.preparation.commandId,
      status: request.preparation.session.status,
      version: request.preparation.session.version,
      errorCode: request.telemetry.code,
      fallbackUsed: request.telemetry.fallbackUsed,
    },
  };
}

function completionMetadata(request: CompleteCommandRequest) {
  return {
    commandId: request.preparation.commandId,
    stage: request.artifacts.session.stage,
    answerLength: request.preparation.answer?.length ?? 0,
    ...(request.artifacts.report ? { reportId: request.artifacts.report.id } : {}),
    runtimeAttempts: request.runtime.attempts,
    fallbackUsed: request.runtime.fallbackUsed,
    schemaValid: request.runtime.schemaValid,
  };
}
