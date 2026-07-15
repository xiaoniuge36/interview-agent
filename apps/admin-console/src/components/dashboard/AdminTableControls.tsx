import { Input, Pagination, Select, Space, Typography } from 'antd';
import { getAntdPageSize } from './admin-pagination';

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
    <div className="admin-table-toolbar">
      <Input.Search
        allowClear
        aria-label={props.searchLabel}
        className="admin-table-search"
        placeholder={props.searchLabel}
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
      />
      <Space className="admin-table-filters" size={8} wrap>
        {props.filters?.map((filter) => <ToolbarSelect filter={filter} key={filter.label} />)}
        <Typography.Text type="secondary">{props.resultLabel}</Typography.Text>
      </Space>
    </div>
  );
}

function ToolbarSelect({ filter }: { filter: ToolbarFilter }) {
  return (
    <Select
      aria-label={filter.label}
      options={filter.options.map((option) => ({ ...option }))}
      value={filter.value}
      onChange={(value) => filter.onChange(String(value))}
    />
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
    <div className="admin-table-pagination">
      <Pagination
        current={props.page}
        pageSize={getAntdPageSize(props.total, props.pageCount)}
        showSizeChanger={false}
        showTotal={(total) => `共 ${total} 条`}
        total={props.total}
        onChange={props.onChange}
      />
    </div>
  );
}
