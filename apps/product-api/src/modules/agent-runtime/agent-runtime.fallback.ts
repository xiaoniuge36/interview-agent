import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import type { AgentRuntimeSessionContext } from '@interview-agent/contracts';
import { roleFromInterviewTitle } from '../../common/role-category';
import {
  initialInterviewQuestion,
  projectInterviewQuestion,
  reflectionInterviewQuestion,
} from '../../common/role-interview-questions';
import {
  AgentRuntimeInvocationError,
  type AgentNextDecision,
  type AgentNextResult,
  type RuntimeFailure,
} from './agent-runtime.types';

const FIRST_FOLLOW_UP_TURN = 1;
const SECOND_FOLLOW_UP_TURN = 2;

export function runtimeResult(input: {
  decision: AgentNextDecision;
  latencyMs: number;
  attempts: number;
  fallbackUsed: boolean;
  schemaValid: boolean | null;
}): AgentNextResult {
  const { decision, ...telemetry } = input;
  return { ...decision, ...telemetry };
}

export function localFallback(
  session: AgentRuntimeSessionContext,
  answer?: string,
): AgentNextDecision {
  const roleTitle = roleFromInterviewTitle(session.title);
  const candidateTurns = session.candidateTurnCount + (answer ? 1 : 0);
  if (!answer) return question('warmup', initialInterviewQuestion(roleTitle));
  if (candidateTurns <= FIRST_FOLLOW_UP_TURN) {
    return question('jd_core', projectInterviewQuestion(roleTitle));
  }
  if (candidateTurns <= SECOND_FOLLOW_UP_TURN) {
    return question('project_deep_dive', reflectionInterviewQuestion(roleTitle));
  }
  return finalQuestion();
}

export function invocationError(input: {
  failure: RuntimeFailure;
  latencyMs: number;
  attempts: number;
}): AgentRuntimeInvocationError {
  const Exception =
    input.failure.kind === 'unavailable' ? ServiceUnavailableException : BadGatewayException;
  return new AgentRuntimeInvocationError({
    telemetry: {
      latencyMs: input.latencyMs,
      attempts: input.attempts,
      schemaValid: input.failure.schemaValid,
      code: input.failure.code,
    },
    exception: new Exception(errorResponse(input.failure)),
  });
}

function errorResponse(failure: RuntimeFailure) {
  return {
    code: failure.code,
    message:
      failure.kind === 'unavailable'
        ? 'AI 面试服务暂时不可用，请稍后重试。'
        : 'AI 面试服务返回了异常结果，请稍后重试。',
  };
}

function question(stage: AgentNextDecision['stage'], content: string): AgentNextDecision {
  return { stage, content, shouldFinish: false };
}

function finalQuestion(): AgentNextDecision {
  return {
    stage: 'final_evaluation',
    content: '本轮面试已完成，正在生成你的训练复盘。',
    shouldFinish: true,
  };
}
