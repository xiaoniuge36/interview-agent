import type { QuestionCatalogQuery } from '@interview-agent/contracts';
import {
  catalogFacets,
  catalogTagCountsSql,
  catalogWhere,
  mapCatalogItem,
  type FacetCount,
} from './question-catalog-query';

const baseQuery: QuestionCatalogQuery = { sort: 'recommended', page: 1, pageSize: 20 };

function facetSource(tagCounts: FacetCount[]) {
  return {
    tagCounts,
    typeCounts: [{ value: 'short_answer', count: 1 }],
    difficultyCounts: [{ value: 'medium', count: 1 }],
  };
}

describe('question catalog company tags', () => {
  it('catalogWhere 将公司筛选转换为 company: 前缀标签', () => {
    const where = catalogWhere('tenant-1', { ...baseQuery, company: '字节跳动', tags: ['缓存'] });
    expect(where.tags).toEqual({ hasEvery: ['company:字节跳动', '缓存'] });
  });

  it('catalogWhere 未选择公司时不注入公司标签', () => {
    const where = catalogWhere('tenant-1', baseQuery);
    expect(where.tags).toBeUndefined();
  });

  it('mapCatalogItem 拆分公司归属且普通标签不含机器前缀', () => {
    const item = mapCatalogItem({
      id: 'q1',
      tenantId: 'public',
      visibility: 'public',
      title: '标题',
      stem: '正文',
      type: 'short_answer',
      difficulty: 'medium',
      tags: ['缓存', 'role:engineering', 'company:字节跳动'],
      options: [],
      sourceRefs: [],
      status: 'published',
    });
    expect(item.tags).toEqual(['缓存']);
    expect(item.companies).toEqual(['字节跳动']);
  });
});

describe('question catalog facets', () => {
  it('catalogFacets 输出公司维度且 tags 维度不泄漏 company: 标签', () => {
    const facets = catalogFacets(
      facetSource([
        { value: '缓存', count: 2 },
        { value: '索引', count: 1 },
        { value: 'company:字节跳动', count: 2 },
        { value: 'company:腾讯', count: 1 },
      ]),
    );
    expect(facets.companies).toEqual([
      { value: '字节跳动', label: '字节跳动', count: 2 },
      { value: '腾讯', label: '腾讯', count: 1 },
    ]);
    expect(facets.tags.map((facet) => facet.value)).toEqual(['缓存', '索引']);
  });

  it('catalogFacets 过滤空白标签，避免空 value 击穿契约校验', () => {
    const facets = catalogFacets(
      facetSource([
        { value: '缓存', count: 1 },
        { value: '', count: 1 },
        { value: '  ', count: 1 },
      ]),
    );
    expect(facets.tags.map((facet) => facet.value)).toEqual(['缓存']);
  });

  it('catalogFacets 标签种类超过契约上限时按热度截断，保证响应可通过校验', expectTopTags);

  it('catalogTagCountsSql 的过滤条件与 catalogWhere 语义一致', expectTagCountsSqlFilters);
});

function expectTopTags() {
  const tagLimit = 200;
  const overflow = 40;
  const tagCounts = [
    ...Array.from({ length: tagLimit + overflow }, (_, index) => ({
      value: `标签-${index}`,
      count: index < overflow ? 2 : 1,
    })),
    ...Array.from({ length: overflow }, (_, index) => ({
      value: `标签-${index}-热门`,
      count: 2,
    })),
  ];
  const facets = catalogFacets(facetSource(tagCounts));
  expect(facets.tags).toHaveLength(tagLimit);
  expect(facets.tags[0]?.count).toBeGreaterThanOrEqual(facets.tags.at(-1)?.count ?? 0);
}

function expectTagCountsSqlFilters() {
  const sql = catalogTagCountsSql('tenant-1', {
    ...baseQuery,
    query: '50%_命中',
    category: 'ai_agent',
    company: '字节跳动',
    tags: ['缓存'],
    type: 'system_design',
    difficulty: 'hard',
  });
  expect(sql.sql).toContain('CROSS JOIN LATERAL unnest');
  expect(sql.sql).toContain('GROUP BY tag');
  expect(sql.values).toContain('tenant-1');
  expect(sql.values).toContain('system_design');
  expect(sql.values).toContain('hard');
  // hasEvery 对应的必选标签数组参数
  expect(sql.values).toContainEqual(['role:ai_agent', 'company:字节跳动', '缓存']);
  // LIKE 元字符被转义，关键词按字面匹配
  expect(sql.values).toContain('%50\\%\\_命中%');
}
