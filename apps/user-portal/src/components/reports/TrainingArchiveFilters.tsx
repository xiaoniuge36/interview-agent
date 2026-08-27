'use client';

import type { CSSProperties } from 'react';
import type { TrainingRecordFilter } from './training-records-model';
import { SearchInput } from '../SearchInput';

const FILTERS_RISE_DELAY = { '--rise-delay': '120ms' } as CSSProperties;

const FILTERS: Array<{ id: TrainingRecordFilter; label: string }> = [
  { id: 'all', label: '全部记录' },
  { id: 'practice', label: '刷题复盘' },
  { id: 'interview', label: '模拟面试' },
];

export type TrainingArchiveCounts = { total: number; practice: number; interview: number };

export function TrainingArchiveFilters({
  filter,
  query,
  counts,
  onChange,
  onQueryChange,
}: {
  filter: TrainingRecordFilter;
  query: string;
  counts?: TrainingArchiveCounts | undefined;
  onChange: (filter: TrainingRecordFilter) => void;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div
      className="training-archive-filters motion-rise"
      style={FILTERS_RISE_DELAY}
      aria-label="筛选训练记录"
    >
      <div className="training-archive-filter-tabs">
        {FILTERS.map((item) => (
          <button
            className={filter === item.id ? 'active' : ''}
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            <FilterCount counts={counts} id={item.id} />
          </button>
        ))}
      </div>
      <ArchiveSearchField query={query} onQueryChange={onQueryChange} />
    </div>
  );
}

function FilterCount({
  counts,
  id,
}: {
  counts?: TrainingArchiveCounts | undefined;
  id: TrainingRecordFilter;
}) {
  if (!counts) return null;
  const value = id === 'all' ? counts.total : counts[id];
  return <i aria-hidden="true">{value}</i>;
}

function ArchiveSearchField({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <SearchInput
      aria-label="搜索训练记录"
      className="training-archive-search-field"
      placeholder="搜索标题、类型、状态或薄弱项"
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      onClear={() => onQueryChange('')}
    />
  );
}
