'use client';

import type { FormEvent } from 'react';
import type { QuestionCatalogQuery, QuestionCatalogResponse } from '@interview-agent/contracts';

const CATEGORY_OPTIONS = [
  ['ai_agent', 'AI Agent'],
  ['engineering', '研发工程'],
  ['data', '数据与算法'],
  ['product_design', '产品与设计'],
  ['growth_operations', '增长与运营'],
  ['business_delivery', '商业与交付'],
  ['generic', '通用能力'],
] as const;
const MAX_TAG_FILTERS = 8;

type QuestionFilterPanelProps = {
  query: QuestionCatalogQuery;
  facets: QuestionCatalogResponse['facets'] | undefined;
  onChange: (key: string, value: string) => void;
};

export function QuestionFilterPanel({ query, facets, onChange }: QuestionFilterPanelProps) {
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onChange('query', String(form.get('query') ?? '').trim());
  }

  return (
    <section className="question-filter-panel" aria-label="题库筛选">
      <form className="question-picker-search" onSubmit={search}>
        <input key={query.query} name="query" defaultValue={query.query ?? ''} placeholder="搜索题目或能力标签" />
        <button type="submit">搜索</button>
      </form>
      <div className="question-filter-fields">
        <FilterSelect label="方向" value={query.category ?? ''} onChange={(value) => onChange('category', value)}>
          <option value="">全部方向</option>
          {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        <FilterSelect label="题型" value={query.type ?? ''} onChange={(value) => onChange('type', value)}>
          <option value="">全部题型</option>
          <option value="short_answer">简答题</option>
          <option value="coding">编程题</option>
          <option value="system_design">系统设计</option>
          <option value="project_deep_dive">项目深挖</option>
          <option value="behavioral">行为面试</option>
        </FilterSelect>
        <FilterSelect label="难度" value={query.difficulty ?? ''} onChange={(value) => onChange('difficulty', value)}>
          <option value="">全部难度</option>
          <option value="intro">入门</option>
          <option value="easy">基础</option>
          <option value="medium">进阶</option>
          <option value="hard">高阶</option>
          <option value="expert">专家</option>
        </FilterSelect>
        <FilterSelect label="排序" value={query.sort} onChange={(value) => onChange('sort', value)}>
          <option value="recommended">推荐优先</option>
          <option value="updated">最近更新</option>
          <option value="difficulty">难度优先</option>
        </FilterSelect>
      </div>
      <TagFilters tags={facets?.tags ?? []} active={query.tags?.[0] ?? ''} onChange={(value) => onChange('tags', value)} />
    </section>
  );
}

function FilterSelect({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>
  );
}

function TagFilters({ tags, active, onChange }: {
  tags: QuestionCatalogResponse['facets']['tags'];
  active: string;
  onChange: (value: string) => void;
}) {
  if (!tags.length) return null;
  return (
    <div className="question-tag-filters" aria-label="能力标签">
      <button className={!active ? 'active' : ''} type="button" onClick={() => onChange('')}>全部标签</button>
      {tags.slice(0, MAX_TAG_FILTERS).map((tag) => (
        <button key={tag.value} className={active === tag.value ? 'active' : ''} type="button" onClick={() => onChange(tag.value)}>
          {tag.label}<span>{tag.count}</span>
        </button>
      ))}
    </div>
  );
}
