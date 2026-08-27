import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  STAR_MATERIAL_QUESTION_TYPES,
  StarMaterialListSchema,
  type StarMaterial,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { visiblePracticeTags } from './practice-question-categories';

/** 达到该分数的行为/项目题作答才会沉淀为可复用素材。 */
const STAR_SCORE_THRESHOLD = 70;
const STAR_MATERIAL_LIMIT = 30;

const STAR_INCLUDE = {
  sessionItem: {
    include: {
      session: { select: { id: true, userId: true } },
      question: { select: { id: true, title: true, type: true, tags: true } },
    },
  },
} satisfies Prisma.EvaluationResultInclude;

type StarRecord = Prisma.EvaluationResultGetPayload<{ include: typeof STAR_INCLUDE }>;

@Injectable()
export class PracticeStarMaterialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async list(context: ProductRequestContext): Promise<StarMaterial[]> {
    this.policy.assert(context.actor, 'practice:read', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    const records = await this.prisma.evaluationResult.findMany({
      where: starMaterialScope(context),
      include: STAR_INCLUDE,
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: STAR_MATERIAL_LIMIT,
    });
    return StarMaterialListSchema.parse(records.map(starMaterialItem));
  }
}

function starMaterialScope(context: ProductRequestContext) {
  return {
    tenantId: context.tenantId,
    score: { gte: STAR_SCORE_THRESHOLD },
    sessionItem: {
      answer: { not: null },
      session: { userId: context.actor.id },
      question: { type: { in: [...STAR_MATERIAL_QUESTION_TYPES] } },
    },
  } satisfies Prisma.EvaluationResultWhereInput;
}

function starMaterialItem(record: StarRecord) {
  const question = record.sessionItem.question;
  return {
    id: record.id,
    practiceItemId: record.sessionItemId,
    questionId: question.id,
    questionTitle: question.title,
    questionType: question.type,
    tags: visiblePracticeTags(question.tags),
    answer: record.sessionItem.answer,
    improvedAnswer: record.improvedAnswer,
    score: record.score,
    dimensionScores: record.dimensionScores ?? [],
    evaluatedAt: record.createdAt.toISOString(),
  };
}
