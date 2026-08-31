import { Injectable } from '@nestjs/common';
import {
  QuestionCatalogResponseSchema,
  type QuestionCatalogQuery,
  type QuestionCatalogResponse,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import {
  catalogFacets,
  catalogTagCountsSql,
  QUESTION_CATALOG_ITEM_SELECT,
  catalogOrderBy,
  catalogWhere,
  mapCatalogItem,
  type FacetCount,
} from './question-catalog-query';

@Injectable()
export class QuestionCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async list(
    context: ProductRequestContext,
    query: QuestionCatalogQuery,
  ): Promise<QuestionCatalogResponse> {
    this.policy.assert(context.actor, 'practice:read', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    const where = catalogWhere(context.tenantId, query);
    // facets 全部在数据库内聚合（unnest/groupBy），不再全量拉回匹配行
    const [total, records, tagCounts, typeGroups, difficultyGroups] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        orderBy: catalogOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: QUESTION_CATALOG_ITEM_SELECT,
      }),
      this.prisma.$queryRaw<FacetCount[]>(catalogTagCountsSql(context.tenantId, query)),
      this.prisma.question.groupBy({ by: ['type'], where, _count: { _all: true } }),
      this.prisma.question.groupBy({ by: ['difficulty'], where, _count: { _all: true } }),
    ]);
    return QuestionCatalogResponseSchema.parse({
      items: records.map(mapCatalogItem),
      facets: catalogFacets({
        tagCounts,
        typeCounts: typeGroups.map((group) => ({ value: group.type, count: group._count._all })),
        difficultyCounts: difficultyGroups.map((group) => ({
          value: group.difficulty,
          count: group._count._all,
        })),
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total ? Math.ceil(total / query.pageSize) : 0,
    });
  }
}
