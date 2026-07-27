'use client';

import type { TrainingRecordFilter } from './training-records-model';
import { SearchInput } from '../SearchInput';

const FILTERS: Array<{ id: TrainingRecordFilter; label: string }> = [
  { id: 'all', label: '全部记录' },
  { id: 'practice', label: '刷题复盘' },
  { id: 'interview', label: '模拟面试' },
];

export function TrainingArchiveFilters({
  filter,
  query,
  onChange,
  onQueryChange,
}: {
  filter: TrainingRecordFilter;
  query: string;
  onChange: (filter: TrainingRecordFilter) => void;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div className="training-archive-filters" aria-label="筛选训练记录">
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
          </button>
        ))}
      </div>
      <ArchiveSearchField query={query} onQueryChange={onQueryChange} />
    </div>
  );
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
