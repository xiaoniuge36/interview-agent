import type { QuestionCatalogQuery } from '@interview-agent/contracts';
import {
  catalogFacets,
  catalogWhere,
  mapCatalogItem,
} from './question-catalog-query';

const baseQuery: QuestionCatalogQuery = { sort: 'recommended', page: 1, pageSize: 20 };

function facetRecord(tags: string[]) {
  return { tags, type: 'short_answer', difficulty: 'medium' } as const;
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

  it('catalogFacets 输出公司维度且 tags 维度不泄漏 company: 标签', () => {
    const facets = catalogFacets([
      facetRecord(['缓存', 'company:字节跳动']),
      facetRecord(['索引', 'company:字节跳动']),
      facetRecord(['缓存', 'company:腾讯']),
    ]);
    expect(facets.companies).toEqual([
      { value: '字节跳动', label: '字节跳动', count: 2 },
      { value: '腾讯', label: '腾讯', count: 1 },
    ]);
    expect(facets.tags.map((facet) => facet.value)).toEqual(['缓存', '索引']);
  });
});
