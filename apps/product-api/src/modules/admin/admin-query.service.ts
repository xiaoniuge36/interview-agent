import { Injectable } from '@nestjs/common';
import {
  type AgentRunListQuery,
  type AuditLogListQuery,
  type CandidateReviewListQuery,
  type ModelProfileListQuery,
  type QuestionListQuery,
} from '@interview-agent/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import {
  agentRunWhere,
  auditLogWhere,
  candidateWhere,
  mapAuditLog,
  mapCandidate,
  mapModelProfile,
  mapQuestion,
  modelProfileWhere,
  questionWhere,
} from './admin-query-mapping';
import { AGENT_RUN_DETAIL_INCLUDE, mapAgentRunDetails } from './admin-agent-run-details';

const EXPORT_LIMIT = 10_000;
const UPDATED_ORDER = [{ updatedAt: 'desc' as const }, { id: 'desc' as const }];
const CREATED_ORDER = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
const CANDIDATE_SOURCE_INCLUDE = {
  importTask: { select: { id: true, title: true } },
} as const;

type AdminAction = 'question:read' | 'candidate:review' | 'model:manage' | 'audit:read';
type PageQuery = { page: number; pageSize: number };
type AdminPage<Item> = { items: Item[]; total: number; page: number; pageSize: number };
type PageOptions<Row, Item> = {
  count: () => Promise<number>;
  load: (skip: number, take: number) => Promise<Row[]>;
  map: (record: Row) => Item;
};
type ExportOptions<Row, Item> = {
  resourceType: string;
  resource: string;
  load: () => Promise<Row[]>;
  map: (record: Row) => Item;
};
type ExportAudit = { resourceType: string; resource: string; count: number };

@Injectable()
export class AdminQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async queryQuestions(context: ProductRequestContext, query: QuestionListQuery) {
    this.assertPermission(context, 'question:read');
    const where = questionWhere(context, query);
    return this.queryPage(query, {
      count: () => this.prisma.question.count({ where }),
      load: (skip, take) =>
        this.prisma.question.findMany({ where, orderBy: UPDATED_ORDER, skip, take }),
      map: mapQuestion,
    });
  }

  async exportQuestions(context: ProductRequestContext, query: QuestionListQuery) {
    this.assertPermission(context, 'question:read');
    const where = questionWhere(context, query);
    return this.exportRows(context, {
      resourceType: 'AdminQuestionExport',
      resource: 'questions',
      load: () =>
        this.prisma.question.findMany({ where, orderBy: UPDATED_ORDER, take: EXPORT_LIMIT }),
      map: mapQuestion,
    });
  }

  async queryCandidates(context: ProductRequestContext, query: CandidateReviewListQuery) {
    this.assertPermission(context, 'candidate:review');
    const where = candidateWhere(context, query);
    return this.queryPage(query, {
      count: () => this.prisma.candidateQuestion.count({ where }),
      load: (skip, take) =>
        this.prisma.candidateQuestion.findMany({
          where,
          orderBy: CREATED_ORDER,
          skip,
          take,
          include: CANDIDATE_SOURCE_INCLUDE,
        }),
      map: mapCandidate,
    });
  }

  async exportCandidates(context: ProductRequestContext, query: CandidateReviewListQuery) {
    this.assertPermission(context, 'candidate:review');
    const where = candidateWhere(context, query);
    return this.exportRows(context, {
      resourceType: 'AdminCandidateExport',
      resource: 'candidates',
      load: () =>
        this.prisma.candidateQuestion.findMany({
          where,
          orderBy: CREATED_ORDER,
          take: EXPORT_LIMIT,
        }),
      map: mapCandidate,
    });
  }

  async queryModelProfiles(context: ProductRequestContext, query: ModelProfileListQuery) {
    this.assertPermission(context, 'model:manage');
    const where = modelProfileWhere(context, query);
    return this.queryPage(query, {
      count: () => this.prisma.modelProfile.count({ where }),
      load: (skip, take) =>
        this.prisma.modelProfile.findMany({ where, orderBy: UPDATED_ORDER, skip, take }),
      map: mapModelProfile,
    });
  }

  async exportModelProfiles(context: ProductRequestContext, query: ModelProfileListQuery) {
    this.assertPermission(context, 'model:manage');
    const where = modelProfileWhere(context, query);
    return this.exportRows(context, {
      resourceType: 'AdminModelProfileExport',
      resource: 'model_profiles',
      load: () =>
        this.prisma.modelProfile.findMany({ where, orderBy: UPDATED_ORDER, take: EXPORT_LIMIT }),
      map: mapModelProfile,
    });
  }

  async queryAgentRuns(context: ProductRequestContext, query: AgentRunListQuery) {
    this.assertPermission(context, 'audit:read');
    const where = agentRunWhere(context, query);
    const skip = (query.page - 1) * query.pageSize;
    const [total, records] = await Promise.all([
      this.prisma.agentRun.count({ where }),
      this.prisma.agentRun.findMany({
        where,
        orderBy: UPDATED_ORDER,
        skip,
        take: query.pageSize,
        include: AGENT_RUN_DETAIL_INCLUDE,
      }),
    ]);
    const items = await mapAgentRunDetails(this.prisma, records);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async exportAgentRuns(context: ProductRequestContext, query: AgentRunListQuery) {
    this.assertPermission(context, 'audit:read');
    const where = agentRunWhere(context, query);
    const records = await this.prisma.agentRun.findMany({
      where,
      orderBy: UPDATED_ORDER,
      take: EXPORT_LIMIT,
      include: AGENT_RUN_DETAIL_INCLUDE,
    });
    const items = await mapAgentRunDetails(this.prisma, records);
    await this.recordExport(context, {
      resourceType: 'AdminAgentRunExport',
      resource: 'agent_runs',
      count: items.length,
    });
    return items;
  }

  async queryAuditLogs(context: ProductRequestContext, query: AuditLogListQuery) {
    this.assertPermission(context, 'audit:read');
    const where = auditLogWhere(context, query);
    return this.queryPage(query, {
      count: () => this.prisma.auditLog.count({ where }),
      load: (skip, take) =>
        this.prisma.auditLog.findMany({ where, orderBy: CREATED_ORDER, skip, take }),
      map: mapAuditLog,
    });
  }

  async exportAuditLogs(context: ProductRequestContext, query: AuditLogListQuery) {
    this.assertPermission(context, 'audit:read');
    const where = auditLogWhere(context, query);
    return this.exportRows(context, {
      resourceType: 'AdminAuditLogExport',
      resource: 'audit_logs',
      load: () =>
        this.prisma.auditLog.findMany({ where, orderBy: CREATED_ORDER, take: EXPORT_LIMIT }),
      map: mapAuditLog,
    });
  }

  private async queryPage<Row, Item>(
    query: PageQuery,
    options: PageOptions<Row, Item>,
  ): Promise<AdminPage<Item>> {
    const skip = (query.page - 1) * query.pageSize;
    const [total, records] = await Promise.all([
      options.count(),
      options.load(skip, query.pageSize),
    ]);
    return { items: records.map(options.map), total, page: query.page, pageSize: query.pageSize };
  }

  private async exportRows<Row, Item>(
    context: ProductRequestContext,
    options: ExportOptions<Row, Item>,
  ): Promise<Item[]> {
    const items = (await options.load()).map(options.map);
    await this.recordExport(context, {
      resourceType: options.resourceType,
      resource: options.resource,
      count: items.length,
    });
    return items;
  }

  private async recordExport(context: ProductRequestContext, input: ExportAudit): Promise<void> {
    await this.audit.record(context, {
      action: 'admin:export',
      resourceType: input.resourceType,
      resourceId: context.requestId,
      metadata: { resource: input.resource, count: input.count },
    });
  }

  private assertPermission(context: ProductRequestContext, action: AdminAction) {
    this.policy.assert(context.actor, action, { tenantId: context.tenantId });
  }
}
