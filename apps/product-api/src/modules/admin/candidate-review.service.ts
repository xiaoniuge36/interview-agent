import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  CandidateQuestionDetailSchema,
  QuestionSchema,
  type CandidateQuestionDetail,
  type PublishCandidateQuestionInput,
  type UpdateCandidateQuestionInput,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CandidateReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async detail(
    context: ProductRequestContext,
    candidateId: string,
  ): Promise<CandidateQuestionDetail> {
    this.assertReviewPermission(context);
    return mapCandidate(await this.loadCandidate(this.prisma, context.tenantId, candidateId));
  }

  async update(
    context: ProductRequestContext,
    candidateId: string,
    input: UpdateCandidateQuestionInput,
  ): Promise<CandidateQuestionDetail> {
    this.assertReviewPermission(context);
    return this.prisma.$transaction(async (transaction) => {
      const current = await this.loadCandidate(transaction, context.tenantId, candidateId);
      if (current.publishedQuestionId) throw publishedCandidateConflict();
      const updated = await transaction.candidateQuestion.update({
        where: { id: current.id },
        data: candidateUpdateData(input),
      });
      await this.audit.record(
        context,
        {
          action: 'candidate:review',
          resourceType: 'CandidateQuestion',
          resourceId: candidateId,
          stateTransition: { from: current.status, to: updated.status, version: 1 },
        },
        transaction,
      );
      return mapCandidate(updated);
    });
  }

  async publish(
    context: ProductRequestContext,
    candidateId: string,
    input: PublishCandidateQuestionInput,
  ) {
    this.assertPublishPermission(context);
    return this.prisma.$transaction(async (transaction) => {
      const candidate = await this.loadCandidate(transaction, context.tenantId, candidateId);
      if (candidate.status !== 'approved') throw candidateNotApproved();
      if (candidate.publishedQuestionId)
        return this.loadPublishedQuestion(transaction, candidate.publishedQuestionId);
      const question = await this.findOrCreateQuestion(transaction, candidate, input.visibility);
      await transaction.candidateQuestion.update({
        where: { id: candidate.id },
        data: { publishedQuestionId: question.id },
      });
      await this.audit.record(
        context,
        {
          action: 'question:write',
          resourceType: 'Question',
          resourceId: question.id,
          metadata: { candidateId: candidate.id, source: 'candidate_review' },
        },
        transaction,
      );
      return QuestionSchema.parse(question);
    });
  }

  private async findOrCreateQuestion(
    transaction: Prisma.TransactionClient,
    candidate: Awaited<ReturnType<CandidateReviewService['loadCandidate']>>,
    visibility: 'public' | 'tenant',
  ) {
    const existing = await transaction.question.findFirst({
      where: { tenantId: candidate.tenantId, title: candidate.title, status: 'published' },
    });
    if (existing) return existing;
    return transaction.question.create({
      data: {
        tenantId: candidate.tenantId,
        visibility,
        title: candidate.title,
        stem: candidate.stem,
        type: candidate.type,
        difficulty: candidate.difficulty,
        tags: candidate.tags,
        answer: candidate.answer,
        rubric: jsonValue(candidate.rubric),
        sourceRefs: candidate.sourceRefs,
        status: 'published',
      },
    });
  }

  private async loadPublishedQuestion(transaction: Prisma.TransactionClient, questionId: string) {
    const question = await transaction.question.findUnique({ where: { id: questionId } });
    if (!question) throw new ConflictException({ code: 'PUBLISHED_QUESTION_MISSING' });
    return QuestionSchema.parse(question);
  }

  private async loadCandidate(
    client: Pick<PrismaService, 'candidateQuestion'> | Prisma.TransactionClient,
    tenantId: string,
    candidateId: string,
  ) {
    const candidate = await client.candidateQuestion.findFirst({
      where: { id: candidateId, tenantId },
    });
    if (candidate) return candidate;
    throw new NotFoundException({
      code: 'CANDIDATE_QUESTION_NOT_FOUND',
      message: 'Candidate question not found.',
    });
  }

  private assertReviewPermission(context: ProductRequestContext) {
    this.policy.assert(context.actor, 'candidate:review', { tenantId: context.tenantId });
  }

  private assertPublishPermission(context: ProductRequestContext) {
    this.assertReviewPermission(context);
    this.policy.assert(context.actor, 'question:write', { tenantId: context.tenantId });
  }
}

function candidateUpdateData(
  input: UpdateCandidateQuestionInput,
): Prisma.CandidateQuestionUpdateInput {
  const data: Prisma.CandidateQuestionUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.stem !== undefined) data.stem = input.stem;
  if (input.type !== undefined) data.type = input.type;
  if (input.difficulty !== undefined) data.difficulty = input.difficulty;
  if (input.answer !== undefined) data.answer = input.answer;
  if (input.rubric !== undefined) data.rubric = jsonValue(input.rubric);
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.reviewNotes !== undefined) data.reviewNotes = input.reviewNotes;
  if (input.status !== undefined) data.status = input.status;
  return data;
}

function mapCandidate(record: {
  id: string;
  tenantId: string;
  importTaskId: string | null;
  publishedQuestionId: string | null;
  title: string;
  stem: string;
  type: string;
  difficulty: string;
  answer: string;
  rubric: Prisma.JsonValue;
  status: string;
  qualityScore: number;
  tags: string[];
  sourceRefs: string[];
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CandidateQuestionDetail {
  return CandidateQuestionDetailSchema.parse({
    ...record,
    rubric: record.rubric,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

function candidateNotApproved() {
  return new BadRequestException({
    code: 'CANDIDATE_NOT_APPROVED',
    message: 'Approve the candidate before publishing.',
  });
}

function publishedCandidateConflict() {
  return new ConflictException({
    code: 'CANDIDATE_ALREADY_PUBLISHED',
    message: 'A published candidate can no longer be edited.',
  });
}
