import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ImportReviewContextSchema,
  ImportTaskSchema,
  ImportTaskStatusSchema,
  type ImportReviewContext,
  type ImportTask,
  type ImportTaskListQuery,
  type CandidateReviewProgress,
  type MarkdownImportRequest,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { MarkdownImportExtractor } from './markdown-import-extractor';

const IMPORT_LIST_LIMIT = 100;
const IMPORT_EXPORT_LIMIT = 10_000;
const PAGE_INDEX_OFFSET = 1;
const IMPORT_TASK_ORDER: Prisma.ImportTaskOrderByWithRelationInput[] = [
  { updatedAt: 'desc' },
  { id: 'desc' },
];

type ImportTaskPage = {
  items: ImportTask[];
  total: number;
  page: number;
  pageSize: number;
};

type CandidatePersistenceInput = {
  transaction: Prisma.TransactionClient;
  tenantId: string;
  assetId: string;
  taskId: string;
  candidates: ReturnType<MarkdownImportExtractor['extract']>;
};

@Injectable()
export class ImportService {
  private readonly extractor = new MarkdownImportExtractor();

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async create(context: ProductRequestContext, input: MarkdownImportRequest): Promise<ImportTask> {
    this.assertPermission(context);
    const candidates = this.extractor.extract(input.markdown);
    if (!candidates.length) throw invalidMarkdown();
    return this.prisma.$transaction(async (transaction) => {
      const asset = await transaction.knowledgeAsset.create({
        data: {
          tenantId: context.tenantId,
          sourceType: 'upload',
          uri: `inline://markdown/${context.requestId}`,
          title: input.title,
          status: 'review',
          metadata: jsonValue({ extractionMode: 'deterministic_fallback', format: 'markdown' }),
        },
      });
      const task = await transaction.importTask.create({
        data: {
          tenantId: context.tenantId,
          assetId: asset.id,
          title: input.title,
          status: 'review',
          candidateCount: candidates.length,
        },
      });
      await this.persistCandidates({
        transaction,
        tenantId: context.tenantId,
        assetId: asset.id,
        taskId: task.id,
        candidates,
      });
      await this.audit.record(
        context,
        {
          action: 'content:import',
          resourceType: 'ImportTask',
          resourceId: task.id,
          metadata: { candidateCount: candidates.length, extractionMode: 'deterministic_fallback' },
        },
        transaction,
      );
      return mapImportTask(task, {
        pending: candidates.length,
        needsEdit: 0,
        approved: 0,
        rejected: 0,
        published: 0,
      });
    });
  }

  async list(context: ProductRequestContext): Promise<ImportTask[]> {
    this.assertPermission(context);
    const tasks = await this.prisma.importTask.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: IMPORT_LIST_LIMIT,
    });
    return this.withCandidateReviewProgress(context.tenantId, tasks);
  }

  async reviewContext(
    context: ProductRequestContext,
    taskId: string,
  ): Promise<ImportReviewContext> {
    this.assertPermission(context);
    const task = await this.prisma.importTask.findFirst({
      where: { id: taskId, tenantId: context.tenantId },
    });
    if (!task) throw importTaskNotFound();
    const [chunks, reviewedTasks] = await Promise.all([
      this.prisma.knowledgeChunk.findMany({
        where: { assetId: task.assetId, tenantId: context.tenantId },
        select: { content: true, metadata: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.withCandidateReviewProgress(context.tenantId, [task]),
    ]);
    return ImportReviewContextSchema.parse({
      task: reviewedTasks[0] ?? mapImportTask(task),
      sourceChunks: chunks.map((chunk, index) => ({
        content: chunk.content,
        sequence: sourceChunkSequence(chunk.metadata, index + 1),
      })),
    });
  }

  async query(context: ProductRequestContext, query: ImportTaskListQuery): Promise<ImportTaskPage> {
    this.assertPermission(context);
    const where = this.queryScope(context, query);
    const [total, tasks] = await Promise.all([
      this.prisma.importTask.count({ where }),
      this.prisma.importTask.findMany({
        where,
        orderBy: IMPORT_TASK_ORDER,
        skip: (query.page - PAGE_INDEX_OFFSET) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const items = await this.withCandidateReviewProgress(context.tenantId, tasks);
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listForExport(
    context: ProductRequestContext,
    query: ImportTaskListQuery,
  ): Promise<ImportTask[]> {
    this.assertPermission(context);
    const tasks = await this.prisma.importTask.findMany({
      where: this.queryScope(context, query),
      orderBy: IMPORT_TASK_ORDER,
      take: IMPORT_EXPORT_LIMIT,
    });
    const items = await this.withCandidateReviewProgress(context.tenantId, tasks);
    await this.audit.record(context, {
      action: 'admin:export',
      resourceType: 'AdminImportExport',
      resourceId: context.requestId,
      metadata: { resource: 'imports', count: items.length },
    });
    return items;
  }

  private async persistCandidates(input: CandidatePersistenceInput) {
    await input.transaction.knowledgeChunk.createMany({
      data: input.candidates.map((candidate, index) => ({
        tenantId: input.tenantId,
        assetId: input.assetId,
        content: candidate.sourceContent,
        metadata: jsonValue({ sequence: index + 1, extractionMode: 'deterministic_fallback' }),
      })),
    });
    await input.transaction.candidateQuestion.createMany({
      data: input.candidates.map((candidate, index) => ({
        tenantId: input.tenantId,
        importTaskId: input.taskId,
        title: candidate.title,
        stem: candidate.stem,
        type: candidate.type,
        difficulty: candidate.difficulty,
        answer: candidate.answer,
        rubric: jsonValue(candidate.rubric),
        qualityScore: candidate.qualityScore,
        tags: candidate.tags,
        sourceRefs: [`knowledge://asset/${input.assetId}/chunk/${index + 1}`],
      })),
    });
  }

  private async withCandidateReviewProgress(
    tenantId: string,
    tasks: Array<Parameters<typeof mapImportTask>[0]>,
  ): Promise<ImportTask[]> {
    if (!tasks.length) return [];
    const taskIds = tasks.map((task) => task.id);
    const candidates = await this.prisma.candidateQuestion.findMany({
      where: { tenantId, importTaskId: { in: taskIds } },
      select: { importTaskId: true, publishedQuestionId: true, status: true },
    });
    const progressByTask = new Map(
      taskIds.map((taskId) => [taskId, emptyCandidateReviewProgress()]),
    );
    for (const candidate of candidates) {
      const progress = candidate.importTaskId
        ? progressByTask.get(candidate.importTaskId)
        : undefined;
      if (progress) incrementCandidateReviewProgress(progress, candidate);
    }
    return tasks.map((task) =>
      mapImportTask(task, progressByTask.get(task.id) ?? emptyCandidateReviewProgress()),
    );
  }

  private queryScope(
    context: ProductRequestContext,
    query: ImportTaskListQuery,
  ): Prisma.ImportTaskWhereInput {
    return {
      tenantId: context.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword ? { title: { contains: query.keyword, mode: 'insensitive' } } : {}),
    };
  }

  private assertPermission(context: ProductRequestContext) {
    this.policy.assert(context.actor, 'content:import', { tenantId: context.tenantId });
  }
}

function mapImportTask(
  record: {
    id: string;
    tenantId: string;
    assetId: string;
    title: string;
    status: string;
    candidateCount: number;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  candidateReviewProgress: CandidateReviewProgress = emptyCandidateReviewProgress(),
): ImportTask {
  return ImportTaskSchema.parse({
    ...record,
    status: ImportTaskStatusSchema.parse(record.status),
    candidateReviewProgress,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

function emptyCandidateReviewProgress(): CandidateReviewProgress {
  return { pending: 0, needsEdit: 0, approved: 0, rejected: 0, published: 0 };
}

function incrementCandidateReviewProgress(
  progress: CandidateReviewProgress,
  candidate: { publishedQuestionId: string | null; status: string },
) {
  if (candidate.publishedQuestionId) {
    progress.published += 1;
    return;
  }
  if (candidate.status === 'pending') progress.pending += 1;
  if (candidate.status === 'needs_edit') progress.needsEdit += 1;
  if (candidate.status === 'approved') progress.approved += 1;
  if (candidate.status === 'rejected') progress.rejected += 1;
}

function invalidMarkdown() {
  return new BadRequestException({
    code: 'IMPORT_MARKDOWN_EMPTY',
    message: 'Markdown content did not contain an importable section.',
  });
}

function importTaskNotFound() {
  return new NotFoundException({
    code: 'IMPORT_TASK_NOT_FOUND',
    message: 'Import task not found.',
  });
}

function sourceChunkSequence(metadata: Prisma.JsonValue, fallback: number): number {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return fallback;
  const sequence = (metadata as Record<string, unknown>).sequence;
  return typeof sequence === 'number' && Number.isInteger(sequence) && sequence > 0
    ? sequence
    : fallback;
}
