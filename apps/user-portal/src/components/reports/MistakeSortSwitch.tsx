import type { MistakeBookSort } from '@interview-agent/contracts';

const SORT_OPTIONS: { value: MistakeBookSort; label: string; hint: string }[] = [
  { value: 'recent', label: '最近错题', hint: '按评价时间倒序' },
  { value: 'priority', label: '优先复练', hint: '分数最低的排前面' },
];

export function MistakeSortSwitch({
  sort,
  onChange,
}: {
  sort: MistakeBookSort;
  onChange: (sort: MistakeBookSort) => void;
}) {
  return (
    <div className="mistake-sort" role="group" aria-label="错题排序方式">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={sort === option.value}
          title={option.hint}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
