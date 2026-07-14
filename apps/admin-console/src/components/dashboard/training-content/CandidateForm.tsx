import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import { useMemo } from 'react';
import { ConsoleIcon } from '@/components/ConsoleIcon';
import type { CandidateFormProps } from './types';
import { splitTags } from './training-utils';

export function CandidateForm(props: CandidateFormProps) {
  const form = useCandidateForm(props);
  return (
    <div className="candidate-form">
      <CandidateContentFields detail={props.detail} change={form.change} tags={form.tags} />
      <CandidateReviewFields detail={props.detail} change={form.change} />
      <RubricList detail={props.detail} />
      <CandidateActions {...props} />
    </div>
  );
}

function useCandidateForm(props: CandidateFormProps) {
  const tags = useMemo(() => props.detail.tags.join(', '), [props.detail.tags]);
  const change = <K extends keyof CandidateQuestionDetail>(
    key: K,
    value: CandidateQuestionDetail[K],
  ) => props.onChange({ ...props.detail, [key]: value });
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
};

function CandidateContentFields(props: CandidateContentFieldsProps) {
  return (
    <>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="text" size={15} />
          题目标题
        </span>
        <input
          value={props.detail.title}
          onChange={(event) => props.change('title', event.target.value)}
        />
      </label>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="document" size={15} />
          题目正文
        </span>
        <textarea
          value={props.detail.stem}
          rows={5}
          onChange={(event) => props.change('stem', event.target.value)}
        />
      </label>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="comment" size={15} />
          参考答案
        </span>
        <textarea
          value={props.detail.answer}
          rows={5}
          onChange={(event) => props.change('answer', event.target.value)}
        />
      </label>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="tag" size={15} />
          标签（以逗号分隔）
        </span>
        <input
          value={props.tags}
          onChange={(event) => props.change('tags', splitTags(event.target.value))}
        />
      </label>
    </>
  );
}

function CandidateReviewFields(props: { detail: CandidateQuestionDetail; change: ChangeDetail }) {
  return (
    <>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="check" size={15} />
          审核状态
        </span>
        <select
          value={props.detail.status}
          onChange={(event) =>
            props.change('status', event.target.value as CandidateQuestionDetail['status'])
          }
        >
          <option value="pending">待审核</option>
          <option value="needs_edit">需修改</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </label>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="comment" size={15} />
          审核备注
        </span>
        <textarea
          value={props.detail.reviewNotes ?? ''}
          rows={3}
          onChange={(event) => props.change('reviewNotes', event.target.value || null)}
        />
      </label>
    </>
  );
}

function RubricList({ detail }: { detail: CandidateQuestionDetail }) {
  return (
    <div className="rubric-list">
      <strong>评分标准</strong>
      {detail.rubric.map((item) => (
        <span key={item.point}>
          {item.point}（{item.score} 分）
        </span>
      ))}
    </div>
  );
}

function CandidateActions(props: CandidateFormProps) {
  return (
    <div className="training-actions">
      <button
        className="button secondary"
        type="button"
        onClick={props.onSave}
        disabled={props.saving}
      >
        {props.saving ? '保存中…' : '保存审核'}
      </button>
      <button
        className="button"
        type="button"
        onClick={props.onPublish}
        disabled={props.saving || props.detail.status !== 'approved'}
      >
        发布到题库
      </button>
    </div>
  );
}
