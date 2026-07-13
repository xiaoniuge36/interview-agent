import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { AgentNextDecision } from '../agent-runtime/agent-runtime.client';
import type { InterviewSession, InterviewStage } from '@interview-agent/contracts';

export type InterviewCommand = 'advance' | 'answer';

const stageOrder: InterviewStage[] = [
  'warmup',
  'self_intro',
  'tech_basics',
  'jd_core',
  'project_deep_dive',
  'scenario_design',
  'hr',
  'final_evaluation',
  'report_ready',
  'memory_updated',
];

const allowedStatus: Record<InterviewCommand, InterviewSession['status'][]> = {
  advance: ['created'],
  answer: ['waiting_user'],
};

export const assertInterviewCommand = (
  session: InterviewSession,
  command: InterviewCommand,
  expectedVersion: number,
) => {
  if (session.version !== expectedVersion) {
    throw new ConflictException({
      code: 'INTERVIEW_VERSION_CONFLICT',
      message: '面试会话已被其他请求更新，请刷新后重试。',
      details: { expectedVersion, actualVersion: session.version },
    });
  }

  if (!allowedStatus[command].includes(session.status)) {
    throw new ConflictException({
      code: 'INTERVIEW_COMMAND_NOT_ALLOWED',
      message: `当前状态 ${session.status} 不允许执行 ${command}。`,
      details: { status: session.status, command },
    });
  }
};

export const assertRuntimeDecision = (
  session: InterviewSession,
  command: InterviewCommand,
  decision: AgentNextDecision,
) => {
  const currentStage = stageOrder.indexOf(session.stage);
  const nextStage = stageOrder.indexOf(decision.stage);
  const forbiddenStage = ['report_ready', 'memory_updated'].includes(decision.stage);
  const regressed = nextStage < currentStage;
  const invalidInitialStage = command === 'advance' && decision.stage !== 'warmup';
  const invalidFinalStage = decision.shouldFinish && decision.stage !== 'final_evaluation';

  if (forbiddenStage || regressed || invalidInitialStage || invalidFinalStage) {
    throw new UnprocessableEntityException({
      code: 'INVALID_AGENT_STATE_TRANSITION',
      message: 'Agent Runtime 返回了不合法的状态迁移。',
      details: {
        command,
        currentStage: session.stage,
        nextStage: decision.stage,
        shouldFinish: decision.shouldFinish,
      },
    });
  }
};
