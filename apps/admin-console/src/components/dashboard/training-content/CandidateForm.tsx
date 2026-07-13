import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import { useMemo } from 'react';
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
        Title
        <input
          value={props.detail.title}
          onChange={(event) => props.change('title', event.target.value)}
        />
      </label>
      <label className="form-label">
        Question stem
        <textarea
          value={props.detail.stem}
          rows={5}
          onChange={(event) => props.change('stem', event.target.value)}
        />
      </label>
      <label className="form-label">
        Reference answer
        <textarea
          value={props.detail.answer}
          rows={5}
          onChange={(event) => props.change('answer', event.target.value)}
        />
      </label>
      <label className="form-label">
        Tags (comma-separated)
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
        Review status
        <select
          value={props.detail.status}
          onChange={(event) =>
            props.change('status', event.target.value as CandidateQuestionDetail['status'])
          }
        >
          <option value="pending">Pending</option>
          <option value="needs_edit">Needs edit</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label className="form-label">
        Review notes
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
      <strong>Scoring rubric</strong>
      {detail.rubric.map((item) => (
        <span key={item.point}>
          {item.point} ({item.score} points)
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
        {props.saving ? 'Saving?' : 'Save review'}
      </button>
      <button
        className="button"
        type="button"
        onClick={props.onPublish}
        disabled={props.saving || props.detail.status !== 'approved'}
      >
        Publish to question bank
      </button>
    </div>
  );
}
