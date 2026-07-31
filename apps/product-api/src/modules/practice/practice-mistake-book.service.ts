import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  MistakeBookSchema,
  type MistakeBook,
  type MistakeBookQuery,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { PracticeCommandService } from './practice-command.service';

const MISTAKE_SCORE_THRESHOLD = 60;
const MISTAKE_INCLUDE = {
  sessionItem: {
    include: {
      session: { select: { id: true, userId: true } },
      question: {
        select: {
          id: true,
          tenantId: true,
          visibility: true,
          title: true,
          stem: true,
          type: true,
          difficulty: true,
          tags: true,
          options: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.EvaluationResultInclude;

type MistakeRecord = Prisma.EvaluationResultGetPayload<{ include: typeof MISTAKE_INCLUDE }>;
type MemoryEvidence = {
  sourceId: string;
  tag: string | null;
  observedScore: number | null;
  evidence: string;
  createdAt: Date;
};
type ReviewRecord = { questionId: string; createdAt: Date };
type MistakeMapping = {
  context: ProductRequestContext;
  evidence: MemoryEvidence[];
  reviews: ReviewRecord[];
};

@Injectable()
export class PracticeMistakeBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: PracticeCommandService,
  ) {}

  async list(context: ProductRequestContext, query: MistakeBookQuery): Promise<MistakeBook> {
    const where = mistakeScope(context);
    const [records, total] = await Promise.all([
      this.prisma.evaluationResult.findMany({
        where,
        include: MISTAKE_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.evaluationResult.count({ where }),
    ]);
    const [evidence, reviews] = await Promise.all([
      this.loadEvidence(context, records),
      this.loadReviews(context, records),
    ]);
    const mapping = { context, evidence, reviews };
    return MistakeBookSchema.parse({
      items: records.map((record) => mistakeItem(record, mapping)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  }

  async startReview(context: ProductRequestContext, mistakeId: string) {
    const record = await this.prisma.evaluationResult.findFirst({
      where: { ...mistakeScope(context), id: mistakeId },
      include: MISTAKE_INCLUDE,
    });
    if (!record || !reviewAvailable(record, context)) throw reviewUnavailable();
    return this.commands.create(context, {
      title: '错题复练',
      mode: 'weakness_review',
      questionIds: [record.sessionItem.question.id],
    });
  }

  private loadEvidence(context: ProductRequestContext, records: MistakeRecord[]) {
    if (!records.length) return Promise.resolve([] as MemoryEvidence[]);
    return this.prisma.memoryEvent.findMany({
      where: {
        tenantId: context.tenantId,
        userId: context.actor.id,
        sourceType: 'practice',
        sourceId: { in: records.map((record) => record.sessionItem.session.id) },
      },
      select: { sourceId: true, tag: true, observedScore: true, evidence: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private loadReviews(context: ProductRequestContext, records: MistakeRecord[]) {
    if (!records.length) return Promise.resolve([] as ReviewRecord[]);
    return this.prisma.practiceSessionItem.findMany({
      where: {
        tenantId: context.tenantId,
        questionId: { in: records.map((record) => record.sessionItem.question.id) },
        session: { userId: context.actor.id, mode: 'weakness_review' },
      },
      select: { questionId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

function mistakeScope(context: ProductRequestContext) {
  return {
    tenantId: context.tenantId,
    score: { lt: MISTAKE_SCORE_THRESHOLD },
    sessionItem: { session: { userId: context.actor.id } },
  } satisfies Prisma.EvaluationResultWhereInput;
}

function mistakeItem(record: MistakeRecord, mapping: MistakeMapping) {
  const question = record.sessionItem.question;
  const reviewedAt = mapping.reviews.find(
    (review) => review.questionId === question.id && review.createdAt > record.createdAt,
  )?.createdAt;
  return {
    id: record.id,
    practiceItemId: record.sessionItemId,
    questionSnapshot: { ...question, options: question.options },
    score: record.score,
    feedback: record.feedback,
    missingPoints: record.missingPoints,
    evidence: evidenceFor(record, mapping.evidence),
    evaluatedAt: record.createdAt.toISOString(),
    reviewedAt: reviewedAt?.toISOString() ?? null,
    canStartReview: reviewAvailable(record, mapping.context),
  };
}

function evidenceFor(record: MistakeRecord, evidence: MemoryEvidence[]) {
  const question = record.sessionItem.question;
  return evidence
    .filter(
      (item) =>
        item.sourceId === record.sessionItem.session.id &&
        item.tag !== null &&
        item.observedScore !== null &&
        question.tags.includes(item.tag),
    )
    .map((item) => ({
      tag: item.tag!,
      evidence: item.evidence,
      observedScore: item.observedScore!,
      createdAt: item.createdAt.toISOString(),
    }));
}

function reviewAvailable(record: MistakeRecord, context: ProductRequestContext) {
  const question = record.sessionItem.question;
  return (
    question.status === 'published' &&
    (question.tenantId === context.tenantId || question.visibility === 'public')
  );
}

function reviewUnavailable() {
  return new ConflictException({
    code: 'MISTAKE_REVIEW_UNAVAILABLE',
    message: '该历史错题当前已下架，仍可回看，但不能开始新的复练。',
  });
}
