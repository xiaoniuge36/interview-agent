import { randomUUID } from 'node:crypto';
import {
  InterviewReportSchema,
  type InterviewReport,
  type InterviewSession,
  type InterviewTurn,
} from '@interview-agent/contracts';
import { roleFromInterviewTitle } from '../../common/role-category';
import { roleGuidanceFor, type RoleReportGuidance } from '../../common/role-guidance';

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
  const roleTitle = roleFromInterviewTitle(input.session.title);
  const guidance = roleGuidanceFor(roleTitle).report;
  return InterviewReportSchema.parse({
    id: `report_${input.session.id}`,
    tenantId: input.session.tenantId,
    sessionId: input.session.id,
    overall: {
      score,
      summary: guidance.summary,
      hiringSignal: score >= POSITIVE_HIRING_THRESHOLD ? 'yes' : 'mixed',
    },
    stageScores: stageScores(score, roleTitle, guidance),
    turnFeedback: turnFeedback(candidateTurns, guidance),
    projectDiagnosis: guidance.projectDiagnosis,
    nextActions: guidance.nextActions,
    memoryEvents: [memoryEvent(input, guidance)],
    createdAt: input.createdAt,
  });
}

function calculateScore(turns: InterviewTurn[]) {
  const answerLength = turns.reduce((sum, turn) => sum + turn.content.length, 0);
  const rawScore =
    BASE_SCORE + turns.length * SCORE_PER_ANSWER + Math.floor(answerLength / ANSWER_LENGTH_STEP);
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, rawScore));
}

function stageScores(score: number, roleTitle: string, guidance: RoleReportGuidance) {
  return [
    {
      stage: 'jd_core' as const,
      score: Math.min(MAX_JD_CORE_SCORE, score + JD_CORE_BONUS),
      summary: `能围绕${roleTitle}的核心能力展开。`,
      evidence: guidance.jdEvidence,
    },
    {
      stage: 'project_deep_dive' as const,
      score: Math.max(MIN_PROJECT_SCORE, score - PROJECT_SCORE_PENALTY),
      summary: '项目表达具备基础，但证据链还可加强。',
      evidence: guidance.projectEvidence,
    },
    {
      stage: 'scenario_design' as const,
      score: Math.max(MIN_SCENARIO_SCORE, score - SCENARIO_SCORE_PENALTY),
      summary: '具备场景判断思路，需要继续练习权衡表达。',
      evidence: guidance.scenarioEvidence,
    },
  ];
}

function turnFeedback(turns: InterviewTurn[], guidance: RoleReportGuidance) {
  return turns.map((turn) => ({
    turnId: turn.id,
    feedback: guidance.turnFeedback,
    missingPoints: guidance.missingPoints,
  }));
}

function memoryEvent(input: ReportFactoryInput, guidance: RoleReportGuidance) {
  return {
    id: `memory_${randomUUID()}`,
    tenantId: input.session.tenantId,
    userId: input.session.userId,
    eventType: 'skill_delta' as const,
    sourceId: input.session.id,
    evidence: guidance.memoryEvidence,
    delta: { tag: guidance.memoryTag, scoreDelta: SCORE_PER_ANSWER, traceId: input.traceId },
    confidence: MEMORY_CONFIDENCE,
    createdAt: input.createdAt,
  };
}
