import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ImportTaskSchema,
  ImportTaskStatusSchema,
  type ImportTask,
  type MarkdownImportRequest,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { MarkdownImportExtractor } from './markdown-import-extractor';

const IMPORT_LIST_LIMIT = 100;

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
      return mapImportTask(task);
    });
  }

  async list(context: ProductRequestContext): Promise<ImportTask[]> {
    this.assertPermission(context);
    const tasks = await this.prisma.importTask.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: IMPORT_LIST_LIMIT,
    });
    return tasks.map(mapImportTask);
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

  private assertPermission(context: ProductRequestContext) {
    this.policy.assert(context.actor, 'content:import', { tenantId: context.tenantId });
  }
}

function mapImportTask(record: {
  id: string;
  tenantId: string;
  assetId: string;
  title: string;
  status: string;
  candidateCount: number;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ImportTask {
  return ImportTaskSchema.parse({
    ...record,
    status: ImportTaskStatusSchema.parse(record.status),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

function invalidMarkdown() {
  return new BadRequestException({
    code: 'IMPORT_MARKDOWN_EMPTY',
    message: 'Markdown content did not contain an importable section.',
  });
}
