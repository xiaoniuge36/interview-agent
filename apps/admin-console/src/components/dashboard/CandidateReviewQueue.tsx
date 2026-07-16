import type { CandidateReview } from '@interview-agent/contracts';
import { Card, Typography } from 'antd';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import type { AdminPagedResponse } from '@/lib/admin-list-api';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { CANDIDATE_STATUS_OPTIONS, CandidateQueueTable } from './CandidateQueueTable';
import { SectionFeedback } from './SectionState';

type CandidateReviewQueueProps = {
  active: boolean;
  importTaskId?: string | undefined;
  onChanged: () => void;
  onClearImportTask: () => void;
  onReview: (candidateId: string) => void;
  refreshKey: number;
};

export function CandidateReviewQueue({
  active,
  importTaskId,
  onChanged,
  onClearImportTask,
  onReview,
  refreshKey,
}: CandidateReviewQueueProps) {
  const list = useAdminPagedList('candidates', {
    enabled: active,
    initialQuery: importTaskId ? { importTaskId } : {},
    reloadKey: refreshKey,
  });
  const { exportList, isExporting } = useAdminListExport('candidates', list.submittedQuery);
  const page =
    list.state.status === 'ready' && !list.isInitialQueryPending ? list.state.data : null;
  return (
    <Card className="admin-table-card" title="候选题审核列表">
      <Typography.Paragraph type="secondary">
        {importTaskId
          ? '当前仅显示该导入资料的候选题，可在同一资料内批量审核。'
          : '筛选待办候选题；列表会明确标注每题的来源资料。'}
      </Typography.Paragraph>
      {page ? (
        <ReadyCandidateQueue
          exportList={exportList}
          importTaskId={importTaskId}
          isExporting={isExporting}
          list={list}
          onChanged={onChanged}
          page={page}
          onClearImportTask={onClearImportTask}
          onReview={onReview}
        />
      ) : (
        <SectionFeedback state={list.state} loadingMessage="正在加载候选题" />
      )}
    </Card>
  );
}

type ReadyCandidateQueueProps = {
  exportList: () => Promise<void>;
  importTaskId?: string | undefined;
  isExporting: boolean;
  list: AdminPagedListController<'candidates'>;
  onChanged: () => void;
  page: AdminPagedResponse<CandidateReview>;
  onClearImportTask: () => void;
  onReview: (candidateId: string) => void;
};

function ReadyCandidateQueue({
  exportList,
  importTaskId,
  isExporting,
  list,
  onChanged,
  onClearImportTask,
  onReview,
  page,
}: ReadyCandidateQueueProps) {
  return (
    <>
      <CandidateQueueToolbar
        exportList={exportList}
        importTaskId={importTaskId}
        isExporting={isExporting}
        list={list}
        total={page.total}
        onClearImportTask={onClearImportTask}
      />
      <CandidateQueueTable
        candidates={page.items}
        list={list}
        onChanged={onChanged}
        onReview={onReview}
      />
      <AdminPagination
        page={page.page}
        pageSize={page.pageSize}
        total={page.total}
        onChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </>
  );
}

type CandidateQueueToolbarProps = Pick<ReadyCandidateQueueProps, 'exportList' | 'importTaskId' | 'isExporting' | 'list' | 'onClearImportTask'> & {
  total: number;
};

function CandidateQueueToolbar({
  exportList,
  importTaskId,
  isExporting,
  list,
  onClearImportTask,
  total,
}: CandidateQueueToolbarProps) {
  return (
    <AdminTableToolbar
      filters={[candidateStatusFilter(list)]}
      isExporting={isExporting}
      isLoading={list.isLoading}
      query={list.draftQuery.keyword ?? ''}
      resultLabel={`共 ${total} 条`}
      searchLabel="搜索候选题或正文"
      onExport={() => void exportList()}
      onQuery={list.query}
      onQueryChange={(keyword) => list.setDraftQuery((current) => ({ ...current, keyword }))}
      onReset={() => resetCandidates(list.reset, importTaskId, onClearImportTask)}
    />
  );
}

function candidateStatusFilter(list: AdminPagedListController<'candidates'>) {
  return {
    label: '状态',
    value: list.draftQuery.status ?? 'all',
    options: CANDIDATE_STATUS_OPTIONS,
    onChange: (value: string) =>
      list.setDraftQuery((current) => ({
        ...current,
        status: value === 'all' ? undefined : (value as CandidateReview['status']),
      })),
  };
}

function resetCandidates(
  reset: () => void,
  importTaskId: string | undefined,
  onClearImportTask: () => void,
) {
  if (importTaskId) {
    onClearImportTask();
    return;
  }
  reset();
}
