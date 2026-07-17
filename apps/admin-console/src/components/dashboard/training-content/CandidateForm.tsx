import { Alert, Button, Card, Form, Input, Popconfirm, Space } from 'antd';
import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import * as React from 'react';
import { useMemo } from 'react';
import type { CandidateFormProps } from './types';
import { canPublishCandidate, splitTags } from './training-utils';

export const PUBLISH_CONFIRMATION = {
  title: '确认发布到题库？',
  description: '将先保存当前审核结论。发布后，该候选题不能再编辑。',
};

export function CandidateForm(props: CandidateFormProps) {
  const form = useCandidateForm(props);
  const readOnly = Boolean(props.detail.publishedQuestionId);
  return (
    <Form className="admin-candidate-form" layout="vertical" requiredMark={false}>
      <CandidateContentFields
        detail={props.detail}
        change={form.change}
        disabled={readOnly}
        tags={form.tags}
      />
      <CandidateReviewFields detail={props.detail} change={form.change} disabled={readOnly} />
      <RubricList detail={props.detail} />
      <CandidateActions {...props} />
    </Form>
  );
}

function useCandidateForm(props: CandidateFormProps) {
  const tags = useMemo(() => props.detail.tags.join(', '), [props.detail.tags]);
  const change = <K extends keyof CandidateQuestionDetail>(
    key: K,
    value: CandidateQuestionDetail[K],
  ) => {
    props.onChange({ ...props.detail, [key]: value });
  };
  return { tags, change };
}

type ChangeDetail = <K extends keyof CandidateQuestionDetail>(
  key: K,
  value: CandidateQuestionDetail[K],
) => void;
type CandidateContentFieldsProps = {
  detail: CandidateQuestionDetail;
  tags: string;
  change: ChangeDetail;
  disabled: boolean;
};

function CandidateContentFields(props: CandidateContentFieldsProps) {
  return (
    <>
      <Form.Item label="题目标题" required>
        <Input
          disabled={props.disabled}
          value={props.detail.title}
          onChange={(event) => props.change('title', event.target.value)}
        />
      </Form.Item>
      <Form.Item label="题目正文" required>
        <Input.TextArea
          disabled={props.disabled}
          rows={5}
          value={props.detail.stem}
          onChange={(event) => props.change('stem', event.target.value)}
        />
      </Form.Item>
      <Form.Item label="参考答案" required>
        <Input.TextArea
          disabled={props.disabled}
          rows={5}
          value={props.detail.answer}
          onChange={(event) => props.change('answer', event.target.value)}
        />
      </Form.Item>
      <Form.Item label="标签（以逗号分隔）">
        <Input
          disabled={props.disabled}
          value={props.tags}
          onChange={(event) => props.change('tags', splitTags(event.target.value))}
        />
      </Form.Item>
    </>
  );
}

function CandidateReviewFields({
  detail,
  change,
  disabled,
}: {
  detail: CandidateQuestionDetail;
  change: ChangeDetail;
  disabled: boolean;
}) {
  return (
    <>
      <Form.Item label="审核结论">
        <Space wrap>
          <Button
            disabled={disabled}
            type={detail.status === 'approved' ? 'primary' : 'default'}
            onClick={() => change('status', 'approved')}
          >
            通过
          </Button>
          <Button
            disabled={disabled}
            type={detail.status === 'needs_edit' ? 'primary' : 'default'}
            onClick={() => change('status', 'needs_edit')}
          >
            需修改
          </Button>
          <Button
            danger
            disabled={disabled}
            type={detail.status === 'rejected' ? 'primary' : 'default'}
            onClick={() => change('status', 'rejected')}
          >
            驳回
          </Button>
        </Space>
      </Form.Item>
      <Form.Item label="审核备注">
        <Input.TextArea
          disabled={disabled}
          rows={3}
          value={detail.reviewNotes ?? ''}
          onChange={(event) => change('reviewNotes', event.target.value || null)}
        />
      </Form.Item>
    </>
  );
}

function RubricList({ detail }: { detail: CandidateQuestionDetail }) {
  return (
    <Card className="admin-rubric-card" size="small" title="评分标准">
      <ul className="admin-rubric-list">
        {detail.rubric.map((item) => (
          <li key={`${item.point}-${item.score}`}>
            {item.point}（{item.score} 分）
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CandidateActions(props: CandidateFormProps) {
  const hasPublished = Boolean(props.detail.publishedQuestionId);
  const canPublish = canPublishCandidate(props.detail.status);
  const publishDisabled = props.saving || hasPublished || !canPublish;
  return (
    <Space className="admin-form-actions" wrap>
      <Button disabled={props.saving || hasPublished} loading={props.saving} onClick={props.onSave}>
        保存审核
      </Button>
      <Popconfirm
        cancelText="取消"
        description={PUBLISH_CONFIRMATION.description}
        disabled={publishDisabled}
        okText="确认发布"
        title={PUBLISH_CONFIRMATION.title}
        onConfirm={props.onPublish}
      >
        <Button disabled={publishDisabled} loading={props.saving} type="primary">
          {hasPublished ? '已发布到题库' : '保存并发布到题库'}
        </Button>
      </Popconfirm>
      {!hasPublished && !canPublish ? (
        <Alert showIcon title="选择“通过”后，可直接保存并发布到题库。" type="info" />
      ) : null}
    </Space>
  );
}
