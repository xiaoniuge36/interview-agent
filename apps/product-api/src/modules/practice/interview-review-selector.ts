import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StageScoreSchema, type StageScore } from '@interview-agent/contracts';
import type { Prisma } from '@prisma/client';
import { classifyRole } from '../../common/role-category';
import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { practiceCategoryTagFor } from './practice-question-categories';

const ACTIONABLE_SCORE = 70;
const QUESTION_LIMIT = 5;
const STAGE_TYPES: Partial<Record<StageScore['stage'], QuestionType>> = {
  self_intro: 'behavioral',
  hr: 'behavioral',
  tech_basics: 'short_answer',
  jd_core: 'short_answer',
  project_deep_dive: 'project_deep_dive',
  scenario_design: 'system_design',
};

type QuestionType = 'behavioral' | 'short_answer' | 'project_deep_dive' | 'system_design';
type InterviewReviewFocus = {
  stage: StageScore['stage'];
  questionType: QuestionType;
  score: number;
};
type QuestionSelectionInput = {
  prisma: Pick<PrismaService, 'question'>;
  context: ProductRequestContext;
  targetRole: string | undefined;
  focus: InterviewReviewFocus[];
};

export function deriveInterviewReviewFocus(stageScores: StageScore[]): InterviewReviewFocus[] {
  return stageScores
    .flatMap((stageScore) => {
      const questionType = STAGE_TYPES[stageScore.stage];
      return questionType && stageScore.score < ACTIONABLE_SCORE
        ? [{ stage: stageScore.stage, questionType, score: stageScore.score }]
        : [];
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 2);
}

export async function selectInterviewReviewQuestions(
  prisma: Pick<PrismaService, 'interviewSession' | 'question'>,
  context: ProductRequestContext,
  sourceInterviewSessionId: string,
) {
  const source = await loadSource(prisma, context, sourceInterviewSessionId);
  const stageScores = StageScoreSchema.array().safeParse(source.report?.stageScores);
  const focus = stageScores.success ? deriveInterviewReviewFocus(stageScores.data) : [];
  if (!focus.length) throw notActionable();
  return findQuestions({ prisma, context, targetRole: source.jobIntent?.targetRole, focus });
}

async function loadSource(
  prisma: Pick<PrismaService, 'interviewSession'>,
  context: ProductRequestContext,
  sourceInterviewSessionId: string,
) {
  const source = await prisma.interviewSession.findFirst({
    where: {
      id: sourceInterviewSessionId,
      tenantId: context.tenantId,
      userId: context.actor.id,
      status: 'report_ready',
    },
    select: {
      id: true,
      jobIntent: { select: { targetRole: true } },
      report: { select: { stageScores: true } },
    },
  });
  if (!source) throw sourceNotFound();
  return source;
}

async function findQuestions({ prisma, context, targetRole, focus }: QuestionSelectionInput) {
  const where = questionScope(context, focus);
  const roleTag = targetRole ? practiceCategoryTagFor(classifyRole(targetRole)) : null;
  const roleQuestions = roleTag
    ? await prisma.question.findMany({
        where: { ...where, tags: { has: roleTag } },
        orderBy: { updatedAt: 'desc' },
        take: QUESTION_LIMIT,
      })
    : [];
  const remaining = QUESTION_LIMIT - roleQuestions.length;
  const fallback = remaining
    ? await prisma.question.findMany({
        where: { ...where, id: { notIn: roleQuestions.map((question) => question.id) } },
        orderBy: { updatedAt: 'desc' },
        take: remaining,
      })
    : [];
  const questions = [...roleQuestions, ...fallback];
  if (!questions.length) throw questionsUnavailable();
  return questions;
}

function questionScope(context: ProductRequestContext, focus: InterviewReviewFocus[]) {
  return {
    status: 'published',
    type: { in: [...new Set(focus.map((item) => item.questionType))] },
    OR: [{ tenantId: context.tenantId }, { visibility: 'public' }],
  } satisfies Prisma.QuestionWhereInput;
}

function sourceNotFound() {
  return new NotFoundException({ code: 'INTERVIEW_REVIEW_SOURCE_NOT_FOUND' });
}

function notActionable() {
  return new BadRequestException({ code: 'INTERVIEW_REVIEW_NOT_ACTIONABLE' });
}

function questionsUnavailable() {
  return new BadRequestException({ code: 'INTERVIEW_REVIEW_QUESTIONS_UNAVAILABLE' });
}
