import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Form, Input, Pagination, Select, Space, Typography } from 'antd';
import { getAntdPageSize } from './admin-pagination';

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

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
  isExporting?: boolean;
  isLoading?: boolean;
  onExport?: () => void;
  onQuery?: () => void;
  onQueryChange: (query: string) => void;
  onReset?: () => void;
};

export function AdminTableToolbar({
  filters,
  isExporting = false,
  isLoading = false,
  onExport,
  onQuery,
  onQueryChange,
  onReset,
  query,
  resultLabel,
  searchLabel,
}: AdminTableToolbarProps) {
  return (
    <Form className="admin-table-toolbar" layout="inline" onFinish={onQuery}>
      <ToolbarFields
        filters={filters}
        query={query}
        searchLabel={searchLabel}
        onQueryChange={onQueryChange}
      />
      <ToolbarActions
        isExporting={isExporting}
        isLoading={isLoading}
        onExport={onExport}
        onQuery={onQuery}
        onReset={onReset}
      />
      <Typography.Text className="admin-table-result" type="secondary">
        {resultLabel}
      </Typography.Text>
    </Form>
  );
}

type ToolbarFieldsProps = {
  filters?: readonly ToolbarFilter[] | undefined;
  query: string;
  searchLabel: string;
  onQueryChange: (query: string) => void;
};

function ToolbarFields({ filters, onQueryChange, query, searchLabel }: ToolbarFieldsProps) {
  return (
    <div className="admin-table-toolbar-fields">
      <Form.Item label="关键词">
        <Input
          allowClear
          aria-label={searchLabel}
          className="admin-table-search"
          placeholder={searchLabel}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </Form.Item>
      {filters?.map((filter) => (
        <ToolbarSelect filter={filter} key={filter.label} />
      ))}
    </div>
  );
}

type ToolbarActionsProps = {
  isExporting: boolean;
  isLoading: boolean;
  onExport?: (() => void) | undefined;
  onQuery?: (() => void) | undefined;
  onReset?: (() => void) | undefined;
};

function ToolbarActions({
  isExporting = false,
  isLoading = false,
  onExport,
  onQuery,
  onReset,
}: ToolbarActionsProps) {
  return (
    <Space className="admin-table-toolbar-actions" size={8} wrap>
      {onQuery ? (
        <Button htmlType="submit" icon={<SearchOutlined />} loading={isLoading} type="primary">
          查询
        </Button>
      ) : null}
      {onReset ? (
        <Button disabled={isLoading} icon={<ReloadOutlined />} onClick={onReset}>
          重置
        </Button>
      ) : null}
      {onExport ? (
        <Button
          disabled={isLoading}
          icon={<DownloadOutlined />}
          loading={isExporting}
          onClick={onExport}
        >
          导出
        </Button>
      ) : null}
    </Space>
  );
}

function ToolbarSelect({ filter }: { filter: ToolbarFilter }) {
  return (
    <Form.Item label={filter.label}>
      <Select
        aria-label={filter.label}
        options={filter.options.map((option) => ({ ...option }))}
        value={filter.value}
        onChange={(value) => filter.onChange(String(value))}
      />
    </Form.Item>
  );
}

type AdminPaginationProps = {
  page: number;
  pageCount?: number;
  pageSize?: number;
  total: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export function AdminPagination({
  onChange,
  onPageSizeChange,
  page,
  pageCount,
  pageSize,
  total,
}: AdminPaginationProps) {
  if (total === 0) return null;
  const resolvedPageSize = pageSize ?? getAntdPageSize(total, pageCount ?? 1);
  return (
    <div className="admin-table-pagination">
      <Pagination
        current={page}
        pageSize={resolvedPageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        showSizeChanger={Boolean(onPageSizeChange)}
        showTotal={(count) => `共 ${count} 条`}
        total={total}
        onChange={(nextPage, nextPageSize) => {
          if (onPageSizeChange && nextPageSize !== resolvedPageSize) {
            onPageSizeChange(nextPageSize);
            return;
          }
          onChange(nextPage);
        }}
      />
    </div>
  );
}
