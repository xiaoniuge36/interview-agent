import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  BatchCandidatePublishResultSchema,
  QuestionSchema,
  type BatchCandidatePublishInput,
  type PublishCandidateQuestionInput,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { runSerializable } from '../../common/database/serializable-transaction';

type PublishOperation = {
  context: ProductRequestContext;
  transaction: Prisma.TransactionClient;
  visibility: 'public' | 'tenant';
};

export class CandidatePublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async publish(
    context: ProductRequestContext,
    candidateId: string,
    input: PublishCandidateQuestionInput,
  ) {
    this.assertPublishPermission(context);
    return runSerializable(this.prisma, async (transaction) => {
      const candidate = await this.loadCandidate(transaction, context.tenantId, candidateId);
      if (candidate.status !== 'approved') throw candidateNotApproved();
      if (candidate.publishedQuestionId) {
        return this.loadPublishedQuestion(
          transaction,
          candidate.tenantId,
          candidate.publishedQuestionId,
        );
      }
      return this.publishCandidateQuestion(
        { context, transaction, visibility: input.visibility },
        candidate,
      );
    });
  }

  async batchPublish(context: ProductRequestContext, input: BatchCandidatePublishInput) {
    this.assertPublishPermission(context);
    return runSerializable(this.prisma, async (transaction) => {
      const candidates = await transaction.candidateQuestion.findMany({
        where: { tenantId: context.tenantId, id: { in: input.candidateIds } },
      });
      assertBatchPublishable(candidates, input.candidateIds);
      let publishedCount = 0;
      let alreadyPublishedCount = 0;

      for (const candidate of candidates) {
        if (candidate.publishedQuestionId) {
          await this.loadPublishedQuestion(
            transaction,
            candidate.tenantId,
            candidate.publishedQuestionId,
          );
          alreadyPublishedCount += 1;
          continue;
        }
        await this.publishCandidateQuestion(
          { context, transaction, visibility: input.visibility },
          candidate,
        );
        publishedCount += 1;
      }

      return BatchCandidatePublishResultSchema.parse({ publishedCount, alreadyPublishedCount });
    });
  }

  private async publishCandidateQuestion(
    operation: PublishOperation,
    candidate: Awaited<ReturnType<CandidatePublicationService['loadCandidate']>>,
  ) {
    const question = await this.findOrCreateQuestion(
      operation.transaction,
      candidate,
      operation.visibility,
    );
    await operation.transaction.candidateQuestion.update({
      where: { id: candidate.id },
      data: { publishedQuestionId: question.id },
    });
    await this.audit.record(
      operation.context,
      {
        action: 'question:write',
        resourceType: 'Question',
        resourceId: question.id,
        metadata: { candidateId: candidate.id, source: 'candidate_review' },
      },
      operation.transaction,
    );
    return QuestionSchema.parse(question);
  }

  private async findOrCreateQuestion(
    transaction: Prisma.TransactionClient,
    candidate: Awaited<ReturnType<CandidatePublicationService['loadCandidate']>>,
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

  private async loadPublishedQuestion(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    questionId: string,
  ) {
    const question = await transaction.question.findUnique({
      where: { tenantId_id: { tenantId, id: questionId } },
    });
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

  private assertPublishPermission(context: ProductRequestContext) {
    this.policy.assert(context.actor, 'candidate:review', { tenantId: context.tenantId });
    if (context.actor.role !== 'admin' && context.actor.role !== 'platform_admin') {
      throw new ForbiddenException({
        code: 'ROLE_NOT_ALLOWED',
        message: '当前身份无权访问该资源。',
      });
    }
    this.policy.assert(context.actor, 'question:write', { tenantId: context.tenantId });
  }
}

function assertBatchPublishable(
  candidates: Array<{ id: string; status: string }>,
  candidateIds: string[],
) {
  if (candidates.length !== new Set(candidateIds).size) {
    throw new NotFoundException({ code: 'CANDIDATE_QUESTION_NOT_FOUND' });
  }
  if (candidates.some((candidate) => candidate.status !== 'approved')) {
    throw candidateNotApproved();
  }
}

function candidateNotApproved() {
  return new BadRequestException({
    code: 'CANDIDATE_NOT_APPROVED',
    message: '候选题审核通过后才能发布。',
  });
}
