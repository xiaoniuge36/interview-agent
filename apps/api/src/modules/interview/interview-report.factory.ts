import { randomUUID } from 'node:crypto';
import {
  InterviewReportSchema,
  type InterviewReport,
  type InterviewSession,
  type InterviewTurn,
} from '@interview-agent/contracts';

const BASE_SCORE = 68;
const SCORE_PER_ANSWER = 6;
const ANSWER_LENGTH_STEP = 180;
const MIN_SCORE = 62;
const MAX_SCORE = 92;
const POSITIVE_HIRING_THRESHOLD = 85;
const MEMORY_CONFIDENCE = 0.82;
const MAX_JD_CORE_SCORE = 95;
const JD_CORE_BONUS = 2;
const MIN_PROJECT_SCORE = 55;
const PROJECT_SCORE_PENALTY = 4;
const MIN_SCENARIO_SCORE = 58;
const SCENARIO_SCORE_PENALTY = 2;

export type ReportFactoryInput = {
  session: InterviewSession;
  traceId: string;
  createdAt: string;
};

export function createInterviewReport(input: ReportFactoryInput): InterviewReport {
  const candidateTurns = input.session.turns.filter((turn) => turn.role === 'candidate');
  const score = calculateScore(candidateTurns);
  return InterviewReportSchema.parse({
    id: `report_${input.session.id}`,
    tenantId: input.session.tenantId,
    sessionId: input.session.id,
    overall: {
      score,
      summary:
        '候选人具备产品工程迁移能力，但仍需强化 Agent 状态机、RAG 权限过滤和评估观测的结构化表达。',
      hiringSignal: score >= POSITIVE_HIRING_THRESHOLD ? 'yes' : 'mixed',
    },
    stageScores: stageScores(score),
    turnFeedback: turnFeedback(candidateTurns),
    projectDiagnosis: [
      '把复杂交互经验转译为 Agent 训练体验是优势。',
      '需要准备一段可复现的端到端演示讲解。',
    ],
    nextActions: ['补一张状态机图', '准备 RAG 权限过滤案例', '补充 SSE 失败降级说明'],
    memoryEvents: [memoryEvent(input)],
    createdAt: input.createdAt,
  });
}

function calculateScore(turns: InterviewTurn[]) {
  const answerLength = turns.reduce((sum, turn) => sum + turn.content.length, 0);
  const rawScore =
    BASE_SCORE + turns.length * SCORE_PER_ANSWER + Math.floor(answerLength / ANSWER_LENGTH_STEP);
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, rawScore));
}

function stageScores(score: number) {
  return [
    {
      stage: 'jd_core' as const,
      score: Math.min(MAX_JD_CORE_SCORE, score + JD_CORE_BONUS),
      summary: '能围绕岗位核心能力展开。',
      evidence: ['提到了工程边界', '能区分 Product API 与 Agent Runtime'],
    },
    {
      stage: 'project_deep_dive' as const,
      score: Math.max(MIN_PROJECT_SCORE, score - PROJECT_SCORE_PENALTY),
      summary: '项目表达具备基础，但证据链还可加强。',
      evidence: ['需要补充指标、故障恢复和观测数据'],
    },
    {
      stage: 'scenario_design' as const,
      score: Math.max(MIN_SCENARIO_SCORE, score - SCENARIO_SCORE_PENALTY),
      summary: '系统设计思路清晰，需要继续练习权衡表达。',
      evidence: ['能说明状态与契约', '需要更明确的降级策略'],
    },
  ];
}

function turnFeedback(turns: InterviewTurn[]) {
  return turns.map((turn) => ({
    turnId: turn.id,
    feedback: '回答方向正确，建议增加具体状态、数据表和失败恢复例子。',
    missingPoints: ['traceId 串联', 'schema 校验失败后的重试策略'],
  }));
}

function memoryEvent(input: ReportFactoryInput) {
  return {
    id: `memory_${randomUUID()}`,
    tenantId: input.session.tenantId,
    userId: input.session.userId,
    eventType: 'skill_delta' as const,
    sourceId: input.session.id,
    evidence: '模拟面试报告显示状态机和观测表达仍需加强。',
    delta: { tag: 'Agent 状态机', scoreDelta: SCORE_PER_ANSWER, traceId: input.traceId },
    confidence: MEMORY_CONFIDENCE,
    createdAt: input.createdAt,
  };
}
