import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import type { AgentRuntimeSessionContext } from '@interview-agent/contracts';
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
  const candidateTurns = session.candidateTurnCount + (answer ? 1 : 0);
  if (!answer) return initialQuestion();
  if (candidateTurns <= FIRST_FOLLOW_UP_TURN) return boundaryQuestion();
  if (candidateTurns <= SECOND_FOLLOW_UP_TURN) return recoveryQuestion();
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
        ? 'Agent Runtime 暂时不可用，请稍后重试。'
        : 'Agent Runtime 返回了无效响应。',
  };
}

function initialQuestion(): AgentNextDecision {
  return {
    stage: 'warmup',
    content: '请用 2 分钟介绍一个最能体现你产品工程能力的 AI Agent 项目。',
    shouldFinish: false,
  };
}

function boundaryQuestion(): AgentNextDecision {
  return {
    stage: 'jd_core',
    content: '请说明这个 Agent 系统的核心边界，以及 Product API 与 Agent Runtime 如何协作。',
    shouldFinish: false,
  };
}

function recoveryQuestion(): AgentNextDecision {
  return {
    stage: 'project_deep_dive',
    content: '如果模型超时或输出不符合契约，你会如何保证面试会话可恢复？',
    shouldFinish: false,
  };
}

function finalQuestion(): AgentNextDecision {
  return {
    stage: 'final_evaluation',
    content: '面试已完成，正在生成结构化评估报告。',
    shouldFinish: true,
  };
}
