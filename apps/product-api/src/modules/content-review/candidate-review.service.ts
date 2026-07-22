import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  BatchCandidateReviewResultSchema,
  CandidateQuestionDetailSchema,
  type BatchCandidatePublishInput,
  type BatchCandidateReviewInput,
  type CandidateQuestionDetail,
  type PublishCandidateQuestionInput,
  type UpdateCandidateQuestionInput,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { runSerializable } from '../../common/database/serializable-transaction';
import { CandidatePublicationService } from './candidate-publication.service';

@Injectable()
export class CandidateReviewService {
  private readonly publication: CandidatePublicationService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {
    this.publication = new CandidatePublicationService(prisma, policy, audit);
  }

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
    return runSerializable(this.prisma, async (transaction) => {
      const current = await this.loadCandidate(transaction, context.tenantId, candidateId);
      if (current.publishedQuestionId) throw publishedCandidateConflict();
      const updated = await transaction.candidateQuestion.update({
        where: { id: current.id },
        data: { ...candidateUpdateData(input), revision: { increment: 1 } },
      });
      await this.audit.record(
        context,
        {
          action: 'candidate:review',
          resourceType: 'CandidateQuestion',
          resourceId: candidateId,
          stateTransition: {
            from: current.status,
            to: updated.status,
            version: updated.revision,
          },
        },
        transaction,
      );
      return mapCandidate(updated);
    });
  }

  async batchReview(context: ProductRequestContext, input: BatchCandidateReviewInput) {
    this.assertReviewPermission(context);
    return runSerializable(this.prisma, async (transaction) => {
      const candidates = await transaction.candidateQuestion.findMany({
        where: { tenantId: context.tenantId, id: { in: input.candidateIds } },
      });
      assertBatchReviewable(candidates, input.candidateIds);
      for (const candidate of candidates) {
        const updated = await transaction.candidateQuestion.update({
          where: { id: candidate.id },
          data: {
            status: input.status,
            reviewNotes: input.reviewNotes,
            revision: { increment: 1 },
          },
        });
        await this.audit.record(
          context,
          {
            action: 'candidate:review',
            resourceType: 'CandidateQuestion',
            resourceId: candidate.id,
            stateTransition: {
              from: candidate.status,
              to: updated.status,
              version: updated.revision,
            },
          },
          transaction,
        );
      }
      return BatchCandidateReviewResultSchema.parse({ updatedCount: candidates.length });
    });
  }

  batchPublish(context: ProductRequestContext, input: BatchCandidatePublishInput) {
    return this.publication.batchPublish(context, input);
  }

  publish(
    context: ProductRequestContext,
    candidateId: string,
    input: PublishCandidateQuestionInput,
  ) {
    return this.publication.publish(context, candidateId, input);
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

function assertBatchReviewable(
  candidates: Array<{
    id: string;
    importTaskId: string | null;
    publishedQuestionId: string | null;
  }>,
  candidateIds: string[],
) {
  if (candidates.length !== new Set(candidateIds).size) {
    throw new NotFoundException({ code: 'CANDIDATE_QUESTION_NOT_FOUND' });
  }
  if (candidates.some((candidate) => candidate.publishedQuestionId)) {
    throw publishedCandidateConflict();
  }
  if (new Set(candidates.map((candidate) => candidate.importTaskId)).size !== 1) {
    throw new BadRequestException({
      code: 'CANDIDATE_BATCH_SOURCE_MISMATCH',
      message: '批量审核仅支持同一来源资料的候选题。',
    });
  }
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

function publishedCandidateConflict() {
  return new ConflictException({
    code: 'CANDIDATE_ALREADY_PUBLISHED',
    message: '候选题已发布到题库，不能再编辑。',
  });
}
