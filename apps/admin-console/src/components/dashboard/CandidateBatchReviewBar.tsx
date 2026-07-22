import { Alert, Button, Input, Popconfirm, Space, Typography } from 'antd';
import * as React from 'react';
import type { CandidateBatchReviewSelection } from './admin-records';

type BatchReviewStatus = 'approved' | 'needs_edit' | 'rejected';

type CandidateBatchReviewBarProps = {
  isSubmitting: boolean;
  notes: string;
  selection: CandidateBatchReviewSelection;
  onNotesChange: (notes: string) => void;
  onPublish: () => void;
  onReview: (status: BatchReviewStatus) => void;
};

export function CandidateBatchReviewBar({
  isSubmitting,
  notes,
  selection,
  onNotesChange,
  onPublish,
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
      {selection.canSubmit ? (
        <ReviewActions isSubmitting={isSubmitting} onReview={onReview} />
      ) : (
        <SourceMismatchAlert />
      )}
      <PublishAction isSubmitting={isSubmitting} selection={selection} onPublish={onPublish} />
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
      <Button
        data-page-agent-not-interactive="true"
        disabled={isSubmitting}
        loading={isSubmitting}
        type="primary"
        onClick={() => onReview('approved')}
      >
        批量通过
      </Button>
      <Button
        data-page-agent-not-interactive="true"
        disabled={isSubmitting}
        loading={isSubmitting}
        onClick={() => onReview('needs_edit')}
      >
        批量需修改
      </Button>
      <Button
        danger
        data-page-agent-not-interactive="true"
        disabled={isSubmitting}
        loading={isSubmitting}
        onClick={() => onReview('rejected')}
      >
        批量驳回
      </Button>
    </Space>
  );
}

function PublishAction({
  isSubmitting,
  selection,
  onPublish,
}: Pick<CandidateBatchReviewBarProps, 'isSubmitting' | 'selection' | 'onPublish'>) {
  if (!selection.canPublish) {
    return <Typography.Text type="secondary">仅发布已通过的候选题。</Typography.Text>;
  }

  return (
    <Space orientation="vertical" size={4}>
      <Typography.Text type="secondary">
        仅发布已通过的候选题；已在题库的题目会自动跳过。
      </Typography.Text>
      <Popconfirm
        cancelText="取消"
        description={`将发布 ${selection.candidateIds.length} 道候选题。发布后将不能再编辑。`}
        okText="确认发布"
        title="确认批量发布到题库？"
        onConfirm={onPublish}
      >
        <Button
          data-page-agent-not-interactive="true"
          disabled={isSubmitting}
          loading={isSubmitting}
          type="primary"
        >
          批量发布到题库
        </Button>
      </Popconfirm>
    </Space>
  );
}

function SourceMismatchAlert() {
  return (
    <Alert showIcon title="已选候选题来自不同导入资料，请按来源文件分别审核。" type="warning" />
  );
}
