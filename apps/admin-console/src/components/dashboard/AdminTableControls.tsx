import { ConsoleIcon } from '@/components/ConsoleIcon';

export type ToolbarFilter = {
  label: string;
  value: string;
  options: readonly { label: string; value: string }[];
  onChange: (value: string) => void;
};

type AdminTableToolbarProps = {
  query: string;
  searchLabel: string;
  resultLabel: string;
  filters?: readonly ToolbarFilter[];
  onQueryChange: (query: string) => void;
};

export function AdminTableToolbar(props: AdminTableToolbarProps) {
  return (
    <div className="table-toolbar">
      <label className="toolbar-search">
        <span className="visually-hidden">{props.searchLabel}</span>
        <ConsoleIcon name="list" size={15} />
        <input
          aria-label={props.searchLabel}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder={props.searchLabel}
          type="search"
          value={props.query}
        />
      </label>
      <div className="toolbar-filters">
        {props.filters?.map((filter) => <ToolbarSelect filter={filter} key={filter.label} />)}
        <span className="table-result-count">{props.resultLabel}</span>
      </div>
    </div>
  );
}

function ToolbarSelect({ filter }: { filter: ToolbarFilter }) {
  return (
    <label className="toolbar-select">
      <span>{filter.label}</span>
      <select
        aria-label={filter.label}
        onChange={(event) => filter.onChange(event.target.value)}
        value={filter.value}
      >
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type AdminPaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
};

export function AdminPagination(props: AdminPaginationProps) {
  if (props.total === 0) return null;
  return (
    <div className="table-pagination" aria-label="分页">
      <span>共 {props.total} 条</span>
      <div>
        <button
          className="button ghost compact-button"
          disabled={props.page <= 1}
          onClick={() => props.onChange(props.page - 1)}
          type="button"
        >
          上一页
        </button>
        <strong>
          {props.page} / {props.pageCount}
        </strong>
        <button
          className="button ghost compact-button"
          disabled={props.page >= props.pageCount}
          onClick={() => props.onChange(props.page + 1)}
          type="button"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
