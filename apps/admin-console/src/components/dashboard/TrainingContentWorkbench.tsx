import { Typography } from 'antd';
import type { CandidateReview } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminDrawer } from './AdminDrawer';
import { CandidateReviewQueue } from './CandidateReviewQueue';
import { resolveReviewCandidateId } from './review-workbench-state';
import { CandidateEditor } from './training-content/CandidateEditor';

type TrainingContentWorkbenchProps = {
  candidates: SectionState<CandidateReview[]>;
  onChanged: () => void;
};

export function TrainingContentWorkbench(props: TrainingContentWorkbenchProps) {
  const [requestedCandidateId, setRequestedCandidateId] = useState<string | null>(null);
  const candidates = props.candidates.status === 'ready' ? props.candidates.data : [];
  const selectedCandidateId = resolveReviewCandidateId(candidates, requestedCandidateId);
  useEffect(() => {
    if (requestedCandidateId && !selectedCandidateId) setRequestedCandidateId(null);
  }, [requestedCandidateId, selectedCandidateId]);
  return (
    <section className="admin-page" id="section-3" aria-labelledby="training-workbench-heading">
      <div className="admin-page-heading">
        <Typography.Title id="training-workbench-heading" level={3}>候选题审核工作台</Typography.Title>
        <Typography.Text type="secondary">先从列表定位候选题，再进入详情完成审核和发布。</Typography.Text>
      </div>
      <CandidateReviewQueue state={props.candidates} onReview={setRequestedCandidateId} />
      <AdminDrawer description="保存审核结论后，已通过的候选题可发布到正式题库。" open={selectedCandidateId !== null} title="审核候选题" onClose={() => setRequestedCandidateId(null)}>
        {selectedCandidateId ? <CandidateEditor candidateId={selectedCandidateId} onChanged={props.onChanged} /> : null}
      </AdminDrawer>
    </section>
  );
}
