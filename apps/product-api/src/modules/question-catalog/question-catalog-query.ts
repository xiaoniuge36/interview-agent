import type { Prisma, Question } from '@prisma/client';
import type {
  QuestionCatalogCategory,
  QuestionCatalogQuery,
} from '@interview-agent/contracts';
import { practiceCategoryTagFor, visiblePracticeTags } from '../practice/practice-question-categories';

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
};

type FacetRecord = Pick<Question, 'tags' | 'type' | 'difficulty'>;

export function catalogWhere(tenantId: string, query: QuestionCatalogQuery) {
  const requiredTags = [
    ...(query.category ? [practiceCategoryTagFor(query.category)] : []),
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

export function mapCatalogItem(record: Question) {
  return {
    id: record.id,
    tenantId: record.tenantId,
    visibility: record.visibility,
    title: record.title,
    stem: record.stem,
    type: record.type,
    difficulty: record.difficulty,
    tags: visiblePracticeTags(record.tags),
    sourceRefs: record.sourceRefs,
    status: record.status,
  };
}

export function catalogFacets(records: FacetRecord[]) {
  return {
    categories: counted(
      records.flatMap((record) => categoryValues(record.tags)),
      (value) => CATEGORY_LABELS[value as QuestionCatalogCategory] ?? value,
    ),
    difficulties: counted(records.map((record) => record.difficulty), labelDifficulty),
    types: counted(records.map((record) => record.type), labelType),
    tags: counted(records.flatMap((record) => visiblePracticeTags(record.tags)), (value) => value),
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

function counted(values: string[], label: (value: string) => string) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function labelDifficulty(value: string) {
  return DIFFICULTY_LABELS[value] ?? value;
}

function labelType(value: string) {
  return TYPE_LABELS[value] ?? value;
}
