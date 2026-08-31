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
const TYPE_OPTIONS = [
  ['short_answer', '简答题'],
  ['coding', '编程题'],
  ['system_design', '系统设计'],
  ['project_deep_dive', '项目深挖'],
  ['behavioral', '行为面试'],
  ['single_choice', '单选题'],
  ['multiple_choice', '多选题'],
] as const;
const DIFFICULTY_OPTIONS = [
  ['intro', '入门'],
  ['easy', '基础'],
  ['medium', '进阶'],
  ['hard', '高阶'],
  ['expert', '专家'],
] as const;
const SORT_OPTIONS = [
  ['recommended', '推荐优先'],
  ['updated', '最近更新'],
  ['difficulty', '难度优先'],
] as const;

type QuestionFilterPanelProps = {
  query: QuestionCatalogQuery;
  facets: QuestionCatalogResponse['facets'] | undefined;
  onChange: (key: string, value: string) => void;
};

export function QuestionFilterPanel({ query, facets, onChange }: QuestionFilterPanelProps) {
  return (
    <section className="question-filter-panel" aria-label="题库筛选">
      <QuestionSearch query={query.query} onChange={onChange} />
      <QuestionFilterFields query={query} onChange={onChange} />
      <ChipFilters
        title="目标公司"
        allLabel="全部公司"
        className="question-company-filters"
        options={facets?.companies ?? []}
        active={query.company ?? ''}
        onChange={(value) => onChange('company', value)}
      />
      <ChipFilters
        title="能力标签"
        allLabel="全部标签"
        className="question-tag-filters"
        options={facets?.tags ?? []}
        active={query.tags?.[0] ?? ''}
        onChange={(value) => onChange('tags', value)}
      />
    </section>
  );
}

function QuestionSearch({
  query,
  onChange,
}: Pick<QuestionFilterPanelProps, 'onChange'> & {
  query: string | undefined;
}) {
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onChange('query', String(form.get('query') ?? '').trim());
  }
  return (
    <form className="question-picker-search" onSubmit={search}>
      <input key={query} name="query" defaultValue={query ?? ''} placeholder="搜索题目或能力标签" />
      <button type="submit">搜索</button>
    </form>
  );
}

function QuestionFilterFields({
  query,
  onChange,
}: Pick<QuestionFilterPanelProps, 'query' | 'onChange'>) {
  return (
    <div className="question-filter-fields">
      <FilterSelect
        label="方向"
        value={query.category ?? ''}
        onChange={(value) => onChange('category', value)}
      >
        <option value="">全部方向</option>
        <SelectOptions options={CATEGORY_OPTIONS} />
      </FilterSelect>
      <FilterSelect
        label="题型"
        value={query.type ?? ''}
        onChange={(value) => onChange('type', value)}
      >
        <option value="">全部题型</option>
        <SelectOptions options={TYPE_OPTIONS} />
      </FilterSelect>
      <FilterSelect
        label="难度"
        value={query.difficulty ?? ''}
        onChange={(value) => onChange('difficulty', value)}
      >
        <option value="">全部难度</option>
        <SelectOptions options={DIFFICULTY_OPTIONS} />
      </FilterSelect>
      <FilterSelect label="排序" value={query.sort} onChange={(value) => onChange('sort', value)}>
        <SelectOptions options={SORT_OPTIONS} />
      </FilterSelect>
    </div>
  );
}

function SelectOptions({ options }: { options: ReadonlyArray<readonly [string, string]> }) {
  return options.map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function ChipFilters({
  title,
  allLabel,
  className,
  options,
  active,
  onChange,
}: {
  title: string;
  allLabel: string;
  className: string;
  options: QuestionCatalogResponse['facets']['tags'];
  active: string;
  onChange: (value: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div className={className} aria-label={title}>
      <span className="chip-filter-title">{title}</span>
      <button
        className={!active ? 'active' : ''}
        type="button"
        aria-pressed={!active}
        onClick={() => onChange('')}
      >
        {allLabel}
      </button>
      {options.slice(0, MAX_TAG_FILTERS).map((option) => (
        <button
          key={option.value}
          className={active === option.value ? 'active' : ''}
          type="button"
          aria-pressed={active === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          <span>{option.count}</span>
        </button>
      ))}
    </div>
  );
}
