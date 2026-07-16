import { Typography } from 'antd';
import { useEffect, useState } from 'react';
import { AdminDrawer } from './AdminDrawer';
import { CandidateReviewQueue } from './CandidateReviewQueue';
import { CandidateEditor } from './training-content/CandidateEditor';
import { ImportReviewContext } from './training-content/ImportReviewContext';

type TrainingContentWorkbenchProps = {
  active: boolean;
  importTaskId?: string | undefined;
  onChanged: () => void;
  onClearImportTask: () => void;
  refreshKey: number;
};

export function TrainingContentWorkbench({
  active,
  importTaskId,
  onChanged,
  onClearImportTask,
  refreshKey,
}: TrainingContentWorkbenchProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  useEffect(() => setSelectedCandidateId(null), [importTaskId]);
  return (
    <section className="admin-page" id="section-3" aria-labelledby="training-workbench-heading">
      <div className="admin-page-heading">
        <Typography.Title id="training-workbench-heading" level={3}>
          候选题审核工作台
        </Typography.Title>
        <Typography.Text type="secondary">
          先从列表定位候选题，再进入详情完成审核和发布。
        </Typography.Text>
      </div>
      <ImportReviewContext active={active} importTaskId={importTaskId} />
      <CandidateReviewQueue
        active={active}
        importTaskId={importTaskId}
        refreshKey={refreshKey}
        onChanged={onChanged}
        onClearImportTask={onClearImportTask}
        onReview={setSelectedCandidateId}
      />
      <AdminDrawer
        description="保存审核结论后，已通过的候选题可发布到正式题库。"
        open={selectedCandidateId !== null}
        title="审核候选题"
        onClose={() => setSelectedCandidateId(null)}
      >
        {selectedCandidateId ? (
          <CandidateEditor candidateId={selectedCandidateId} onChanged={onChanged} />
        ) : null}
      </AdminDrawer>
    </section>
  );
}
