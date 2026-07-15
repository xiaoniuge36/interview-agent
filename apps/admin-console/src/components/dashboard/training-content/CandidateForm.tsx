import { Alert, Button, Card, Form, Input, List, Select, Space } from 'antd';
import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import { useMemo } from 'react';
import type { CandidateFormProps } from './types';
import { canPublishCandidate, splitTags } from './training-utils';

export function CandidateForm(props: CandidateFormProps) {
  const form = useCandidateForm(props);
  return (
    <Form className="admin-candidate-form" layout="vertical" requiredMark={false}>
      <CandidateContentFields detail={props.detail} change={form.change} tags={form.tags} />
      <CandidateReviewFields detail={props.detail} change={form.change} />
      <RubricList detail={props.detail} />
      <CandidateActions {...props} />
    </Form>
  );
}

function useCandidateForm(props: CandidateFormProps) {
  const tags = useMemo(() => props.detail.tags.join(', '), [props.detail.tags]);
  const change = <K extends keyof CandidateQuestionDetail>(key: K, value: CandidateQuestionDetail[K]) => {
    props.onChange({ ...props.detail, [key]: value });
  };
  return { tags, change };
}

type ChangeDetail = <K extends keyof CandidateQuestionDetail>(key: K, value: CandidateQuestionDetail[K]) => void;
type CandidateContentFieldsProps = { detail: CandidateQuestionDetail; tags: string; change: ChangeDetail };

function CandidateContentFields(props: CandidateContentFieldsProps) {
  return (
    <>
      <Form.Item label="题目标题" required><Input value={props.detail.title} onChange={(event) => props.change('title', event.target.value)} /></Form.Item>
      <Form.Item label="题目正文" required><Input.TextArea rows={5} value={props.detail.stem} onChange={(event) => props.change('stem', event.target.value)} /></Form.Item>
      <Form.Item label="参考答案" required><Input.TextArea rows={5} value={props.detail.answer} onChange={(event) => props.change('answer', event.target.value)} /></Form.Item>
      <Form.Item label="标签（以逗号分隔）"><Input value={props.tags} onChange={(event) => props.change('tags', splitTags(event.target.value))} /></Form.Item>
    </>
  );
}

function CandidateReviewFields({ detail, change }: { detail: CandidateQuestionDetail; change: ChangeDetail }) {
  return (
    <>
      <Form.Item label="审核状态">
        <Select
          options={[
            { value: 'pending', label: '待审核' },
            { value: 'needs_edit', label: '需修改' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已拒绝' },
          ]}
          value={detail.status}
          onChange={(status) => change('status', status as CandidateQuestionDetail['status'])}
        />
      </Form.Item>
      <Form.Item label="审核备注"><Input.TextArea rows={3} value={detail.reviewNotes ?? ''} onChange={(event) => change('reviewNotes', event.target.value || null)} /></Form.Item>
    </>
  );
}

function RubricList({ detail }: { detail: CandidateQuestionDetail }) {
  return (
    <Card className="admin-rubric-card" size="small" title="评分标准">
      <List dataSource={detail.rubric} renderItem={(item) => <List.Item>{item.point}（{item.score} 分）</List.Item>} size="small" />
    </Card>
  );
}

function CandidateActions(props: CandidateFormProps) {
  return (
    <Space className="admin-form-actions" wrap>
      <Button loading={props.saving} onClick={props.onSave}>保存审核</Button>
      <Button disabled={props.saving || !canPublishCandidate(props.detail.status)} loading={props.saving} type="primary" onClick={props.onPublish}>发布到题库</Button>
      {!canPublishCandidate(props.detail.status) ? <Alert message="候选题审核通过后才能发布。" showIcon type="info" /> : null}
    </Space>
  );
}
