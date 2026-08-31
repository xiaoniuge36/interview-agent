import { FileSearchOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Space, Table, Typography } from 'antd';
import type { ImportTask } from '@interview-agent/contracts';
import { useState } from 'react';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import { AdminDrawer } from './AdminDrawer';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { importStatusOptions, importTaskColumns } from './import-task-columns';
import { ImportPipeline } from './ImportPipeline';
import { SectionFeedback } from './SectionState';
import { MarkdownImportForm } from './training-content/MarkdownImportForm';

type ImportCenterProps = {
  active: boolean;
  dashboard: Parameters<typeof ImportPipeline>[0]['state'];
  onChanged: () => void;
  onNavigate: (importTaskId?: string) => void;
  refreshKey: number;
};

export function ImportCenter({
  active,
  dashboard,
  onChanged,
  onNavigate,
  refreshKey,
}: ImportCenterProps) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const list = useAdminPagedList('imports', { enabled: active, reloadKey: refreshKey });
  const { exportList, isExporting } = useAdminListExport('imports', list.submittedQuery);
  const completeImport = () => {
    setDrawerOpen(false);
    setMessage('导入任务已创建，列表正在刷新。');
  };
  const refreshAfterImport = () => {
    onChanged();
  };
  return (
    <section className="admin-page" aria-labelledby="import-center-heading">
      <ImportCenterHeader
        onNavigate={onNavigate}
        onOpen={() => {
          setMessage('');
          setDrawerOpen(true);
        }}
      />
      {message ? <Alert title={message} showIcon type="success" /> : null}
      <ImportHistory
        exportList={exportList}
        isExporting={isExporting}
        list={list}
        onReview={onNavigate}
      />
      <ImportPipeline state={dashboard} onRetry={onChanged} />
      <ImportDrawer
        open={isDrawerOpen}
        onChanged={refreshAfterImport}
        onClose={() => setDrawerOpen(false)}
        onCompleted={completeImport}
      />
    </section>
  );
}

function ImportCenterHeader({
  onNavigate,
  onOpen,
}: {
  onNavigate: (importTaskId?: string) => void;
  onOpen: () => void;
}) {
  return (
    <div className="admin-page-heading admin-page-heading-actions">
      <div>
        <Typography.Title id="import-center-heading" level={3}>
          资料导入与任务记录
        </Typography.Title>
        <Typography.Text type="secondary">
          导入只会生成待审核候选题，不会绕过治理流程直接发布。
        </Typography.Text>
      </div>
      <Space>
        <Button icon={<FileSearchOutlined />} onClick={() => onNavigate()}>
          审核待办
        </Button>
        <Button type="primary" onClick={onOpen}>
          导入资料
        </Button>
      </Space>
    </div>
  );
}

type ImportDrawerProps = {
  open: boolean;
  onChanged: () => void;
  onClose: () => void;
  onCompleted: () => void;
};

function ImportDrawer({ onChanged, onClose, onCompleted, open }: ImportDrawerProps) {
  return (
    <AdminDrawer
      description="提交后系统会创建导入任务，并生成待审核候选题。"
      open={open}
      title="导入 Markdown 资料"
      onClose={onClose}
    >
      <MarkdownImportForm onChanged={onChanged} onCompleted={onCompleted} />
    </AdminDrawer>
  );
}

type ImportHistoryProps = {
  exportList: () => Promise<void>;
  isExporting: boolean;
  list: AdminPagedListController<'imports'>;
  onReview: (taskId?: string) => void;
};

function ImportHistory({ exportList, isExporting, list, onReview }: ImportHistoryProps) {
  const page = list.state.status === 'ready' ? list.state.data : null;
  return (
    <Card className="admin-table-card" title="最近导入任务">
      {page ? (
        <>
          <AdminTableToolbar
            filters={[
              {
                label: '状态',
                value: list.draftQuery.status ?? 'all',
                options: importStatusOptions(),
                onChange: (value) =>
                  list.setDraftQuery((current) => ({
                    ...current,
                    status: value === 'all' ? undefined : (value as ImportTask['status']),
                  })),
              },
            ]}
            isExporting={isExporting}
            isLoading={list.isLoading}
            query={list.draftQuery.keyword ?? ''}
            resultLabel={`共 ${page.total} 条`}
            searchLabel="搜索任务名称"
            onExport={() => void exportList()}
            onQuery={list.query}
            onQueryChange={(keyword) => list.setDraftQuery((current) => ({ ...current, keyword }))}
            onReset={list.reset}
          />
          <ImportTaskTable tasks={page.items} onReview={onReview} />
          <AdminPagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            onChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        </>
      ) : (
        <SectionFeedback
          state={list.state}
          loadingMessage="正在加载导入任务"
          onRetry={list.reload}
        />
      )}
    </Card>
  );
}

function ImportTaskTable({
  onReview,
  tasks,
}: {
  onReview: (taskId?: string) => void;
  tasks: ImportTask[];
}) {
  if (!tasks.length)
    return <Empty description="没有匹配的导入任务。" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <Table
      columns={importTaskColumns(onReview)}
      dataSource={tasks}
      pagination={false}
      rowKey="id"
      scroll={{ x: 1040 }}
      size="middle"
    />
  );
}
