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
  catalogOrderBy,
  catalogWhere,
  mapCatalogItem,
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
    const [total, records, facetRecords] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        orderBy: catalogOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.question.findMany({
        where,
        select: { tags: true, type: true, difficulty: true },
      }),
    ]);
    return QuestionCatalogResponseSchema.parse({
      items: records.map(mapCatalogItem),
      facets: catalogFacets(facetRecords),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total ? Math.ceil(total / query.pageSize) : 0,
    });
  }
}
