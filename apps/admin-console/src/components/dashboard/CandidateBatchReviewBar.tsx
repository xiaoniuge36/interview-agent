import { Alert, Button, Input, Space, Typography } from 'antd';
import * as React from 'react';
import type { CandidateBatchReviewSelection } from './admin-records';

type BatchReviewStatus = 'approved' | 'needs_edit' | 'rejected';

type CandidateBatchReviewBarProps = {
  isSubmitting: boolean;
  notes: string;
  selection: CandidateBatchReviewSelection;
  onNotesChange: (notes: string) => void;
  onReview: (status: BatchReviewStatus) => void;
};

export function CandidateBatchReviewBar({
  isSubmitting,
  notes,
  selection,
  onNotesChange,
  onReview,
}: CandidateBatchReviewBarProps) {
  return (
    <div className="admin-batch-review-bar">
      <div className="admin-batch-review-summary">
        <Typography.Text strong>已选 {selection.candidateIds.length} 题</Typography.Text>
        <Typography.Text type="secondary">
          来源：{selection.sourceImport?.title ?? '非导入来源'}
        </Typography.Text>
      </div>
      {selection.canSubmit ? <ReviewActions isSubmitting={isSubmitting} onReview={onReview} /> : <SourceMismatchAlert />}
      <Input.TextArea
        aria-label="批量审核备注"
        maxLength={500}
        placeholder="统一审核备注（可选，将写入已选候选题）"
        rows={2}
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
      />
    </div>
  );
}

function ReviewActions({
  isSubmitting,
  onReview,
}: Pick<CandidateBatchReviewBarProps, 'isSubmitting' | 'onReview'>) {
  return (
    <Space wrap>
      <Button disabled={isSubmitting} loading={isSubmitting} type="primary" onClick={() => onReview('approved')}>
        批量通过
      </Button>
      <Button disabled={isSubmitting} loading={isSubmitting} onClick={() => onReview('needs_edit')}>
        批量需修改
      </Button>
      <Button danger disabled={isSubmitting} loading={isSubmitting} onClick={() => onReview('rejected')}>
        批量驳回
      </Button>
    </Space>
  );
}

function SourceMismatchAlert() {
  return (
    <Alert
      showIcon
      title="已选候选题来自不同导入资料，请按来源文件分别审核。"
      type="warning"
    />
  );
}
