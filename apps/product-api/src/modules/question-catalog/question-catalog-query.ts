import type { Prisma, Question } from '@prisma/client';
import {
  CONTRACT_LIMITS,
  type QuestionCatalogCategory,
  type QuestionCatalogQuery,
} from '@interview-agent/contracts';
import {
  companiesFromTags,
  companyTagFor,
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

type FacetRecord = Pick<Question, 'tags' | 'type' | 'difficulty'>;

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
  const requiredTags = [
    ...(query.category ? [practiceCategoryTagFor(query.category)] : []),
    ...(query.company ? [companyTagFor(query.company)] : []),
    ...(query.tags ?? []),
  ];
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

export function catalogFacets(records: FacetRecord[]) {
  return {
    categories: counted(
      records.flatMap((record) => categoryValues(record.tags)),
      (value) => CATEGORY_LABELS[value as QuestionCatalogCategory] ?? value,
      CONTRACT_LIMITS.list,
    ),
    difficulties: counted(
      records.map((record) => record.difficulty),
      labelDifficulty,
      CONTRACT_LIMITS.list,
    ),
    types: counted(
      records.map((record) => record.type),
      labelType,
      CONTRACT_LIMITS.list,
    ),
    tags: counted(
      records.flatMap((record) => visiblePracticeTags(record.tags)),
      (value) => value,
      CONTRACT_LIMITS.mediumList,
    ),
    companies: counted(
      records.flatMap((record) => companiesFromTags(record.tags)),
      (value) => value,
      CONTRACT_LIMITS.mediumList,
    ),
  };
}

function keywordFilters(keyword: string): Prisma.QuestionWhereInput[] {
  return [
    { title: { contains: keyword, mode: 'insensitive' } },
    { stem: { contains: keyword, mode: 'insensitive' } },
    { tags: { has: keyword } },
  ];
}

function categoryValues(tags: string[]) {
  return tags
    .filter((tag) => tag.startsWith('role:'))
    .map((tag) => tag.slice('role:'.length))
    .filter((value): value is QuestionCatalogCategory => value in CATEGORY_LABELS);
}

/** facet 按出现次数取 Top N：题库扩充后标签种类会超过契约上限，只保留高频项。 */
function counted(values: string[], label: (value: string) => string, limit: number) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
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
