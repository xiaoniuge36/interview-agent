import { Prisma } from '@prisma/client';
import {
  CONTRACT_LIMITS,
  type QuestionCatalogCategory,
  type QuestionCatalogQuery,
} from '@interview-agent/contracts';
import {
  companiesFromTags,
  companyTagFor,
  isCompanyTag,
  isPracticeCategoryTag,
  practiceCategoryTagFor,
  visiblePracticeTags,
} from '../practice/practice-question-categories';

const CATEGORY_LABELS: Record<QuestionCatalogCategory, string> = {
  engineering: '研发工程',
  data: '数据与算法',
  ai_agent: 'AI Agent',
  product_design: '产品与设计',
  growth_operations: '增长与运营',
  business_delivery: '商业与交付',
  generic: '通用能力',
};
const DIFFICULTY_LABELS: Record<string, string> = {
  intro: '入门',
  easy: '基础',
  medium: '进阶',
  hard: '高阶',
  expert: '专家',
};
const TYPE_LABELS: Record<string, string> = {
  short_answer: '简答题',
  coding: '编程题',
  system_design: '系统设计',
  project_deep_dive: '项目深挖',
  behavioral: '行为面试',
  single_choice: '单选题',
  multiple_choice: '多选题',
};

export type FacetCount = { value: string; count: number };

export type CatalogFacetSource = {
  tagCounts: FacetCount[];
  typeCounts: FacetCount[];
  difficultyCounts: FacetCount[];
};

export const QUESTION_CATALOG_ITEM_SELECT = {
  id: true,
  tenantId: true,
  visibility: true,
  title: true,
  stem: true,
  type: true,
  difficulty: true,
  tags: true,
  options: true,
  sourceRefs: true,
  status: true,
} satisfies Prisma.QuestionSelect;

type CatalogItemRecord = Prisma.QuestionGetPayload<{
  select: typeof QUESTION_CATALOG_ITEM_SELECT;
}>;

export function catalogWhere(tenantId: string, query: QuestionCatalogQuery) {
  const requiredTags = requiredTagsFor(query);
  const keyword = query.query?.trim();
  return {
    status: 'published',
    ...(query.type ? { type: query.type } : {}),
    ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    ...(requiredTags.length ? { tags: { hasEvery: requiredTags } } : {}),
    AND: [
      { OR: [{ tenantId }, { visibility: 'public' }] },
      ...(keyword ? [{ OR: keywordFilters(keyword) }] : []),
    ],
  } satisfies Prisma.QuestionWhereInput;
}

/**
 * 标签 facet 用 unnest 在数据库内聚合，避免把全部匹配行拉回内存（O(N) 热点）。
 * WHERE 条件必须与 catalogWhere 保持语义一致，改动其一时同步另一处。
 */
export function catalogTagCountsSql(tenantId: string, query: QuestionCatalogQuery): Prisma.Sql {
  return Prisma.sql`SELECT tag AS value, COUNT(*)::int AS count
FROM "Question" AS q
CROSS JOIN LATERAL unnest(q."tags") AS tag
WHERE ${catalogWhereSql(tenantId, query)}
GROUP BY tag`;
}

function catalogWhereSql(tenantId: string, query: QuestionCatalogQuery): Prisma.Sql {
  const requiredTags = requiredTagsFor(query);
  const keyword = query.query?.trim();
  const conditions: Prisma.Sql[] = [
    Prisma.sql`q."status" = 'published'::"QuestionStatus"`,
    Prisma.sql`(q."tenantId" = ${tenantId} OR q."visibility" = 'public'::"QuestionVisibility")`,
  ];
  if (query.type) {
    conditions.push(Prisma.sql`q."type" = ${query.type}::"QuestionType"`);
  }
  if (query.difficulty) {
    conditions.push(Prisma.sql`q."difficulty" = ${query.difficulty}::"QuestionDifficulty"`);
  }
  if (requiredTags.length) {
    conditions.push(Prisma.sql`q."tags" @> ${requiredTags}::text[]`);
  }
  if (keyword) {
    const pattern = `%${escapeLikePattern(keyword)}%`;
    conditions.push(
      Prisma.sql`(q."title" ILIKE ${pattern} OR q."stem" ILIKE ${pattern} OR q."tags" @> ARRAY[${keyword}]::text[])`,
    );
  }
  return Prisma.join(conditions, ' AND ');
}

function requiredTagsFor(query: QuestionCatalogQuery): string[] {
  return [
    ...(query.category ? [practiceCategoryTagFor(query.category)] : []),
    ...(query.company ? [companyTagFor(query.company)] : []),
    ...(query.tags ?? []),
  ];
}

/** 与 Prisma contains 一致：LIKE 元字符按字面匹配。 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function catalogOrderBy(
  sort: QuestionCatalogQuery['sort'],
): Prisma.QuestionOrderByWithRelationInput[] {
  if (sort === 'difficulty') return [{ difficulty: 'desc' }, { updatedAt: 'desc' }];
  return [{ updatedAt: 'desc' }, { id: 'desc' }];
}

export function mapCatalogItem(record: CatalogItemRecord) {
  return {
    id: record.id,
    tenantId: record.tenantId,
    visibility: record.visibility,
    title: record.title,
    stem: record.stem,
    type: record.type,
    difficulty: record.difficulty,
    tags: visiblePracticeTags(record.tags),
    companies: companiesFromTags(record.tags),
    options: record.options,
    sourceRefs: record.sourceRefs,
    status: record.status,
  };
}

export function catalogFacets(source: CatalogFacetSource) {
  const categories = source.tagCounts
    .filter((entry) => isPracticeCategoryTag(entry.value))
    .map((entry) => ({ ...entry, value: entry.value.slice('role:'.length) }))
    .filter((entry) => entry.value in CATEGORY_LABELS);
  const companies = source.tagCounts
    .filter((entry) => isCompanyTag(entry.value))
    .map((entry) => ({ ...entry, value: entry.value.slice('company:'.length).trim() }))
    .filter((entry) => entry.value.length > 0);
  const visibleTags = source.tagCounts.filter(
    (entry) =>
      entry.value.trim().length > 0 &&
      !isPracticeCategoryTag(entry.value) &&
      !isCompanyTag(entry.value),
  );
  return {
    categories: counted(
      categories,
      (value) => CATEGORY_LABELS[value as QuestionCatalogCategory] ?? value,
      CONTRACT_LIMITS.list,
    ),
    difficulties: counted(source.difficultyCounts, labelDifficulty, CONTRACT_LIMITS.list),
    types: counted(source.typeCounts, labelType, CONTRACT_LIMITS.list),
    tags: counted(visibleTags, (value) => value, CONTRACT_LIMITS.mediumList),
    companies: counted(companies, (value) => value, CONTRACT_LIMITS.mediumList),
  };
}

function keywordFilters(keyword: string): Prisma.QuestionWhereInput[] {
  return [
    { title: { contains: keyword, mode: 'insensitive' } },
    { stem: { contains: keyword, mode: 'insensitive' } },
    { tags: { has: keyword } },
  ];
}

/** facet 按出现次数取 Top N（同值合并计数）：题库扩充后标签种类会超过契约上限，只保留高频项。 */
function counted(entries: FacetCount[], label: (value: string) => string, limit: number) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.value, (counts.get(entry.value) ?? 0) + entry.count);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function labelDifficulty(value: string) {
  return DIFFICULTY_LABELS[value] ?? value;
}

function labelType(value: string) {
  return TYPE_LABELS[value] ?? value;
}
