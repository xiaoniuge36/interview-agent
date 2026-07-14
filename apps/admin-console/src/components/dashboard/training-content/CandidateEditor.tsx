import type { CandidateQuestionDetail, CandidateReview } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import { ConsoleIcon } from '@/components/ConsoleIcon';
import { getCandidateDetail, publishCandidate, updateCandidate } from '@/lib/training-content-api';
import { resolveCandidateSelection } from '../admin-records';
import { SectionFeedback } from '../SectionState';
import { CandidateForm } from './CandidateForm';
import type { CandidateEditorProps, ChangeHandler } from './types';
import { candidateUpdateInput, errorMessage, statusLabel } from './training-utils';

export function CandidateEditor(props: CandidateEditorProps) {
  const candidates = props.candidates.status === 'ready' ? props.candidates.data : [];
  const selectedId = resolveCandidateSelection(candidates, props.selectedCandidateId, null);
  const detailState = useCandidateDetail(selectedId);
  const actions = useCandidateActions({ detailState, onChanged: props.onChanged });
  return (
    <CandidateEditorCard
      candidates={candidates}
      selectedId={selectedId}
      onSelect={props.onCandidateSelect}
      sourceState={props.candidates}
      detailState={detailState}
      actions={actions}
    />
  );
}

type CandidateDetailState = ReturnType<typeof useCandidateDetail>;
type CandidateActions = ReturnType<typeof useCandidateActions>;
type CandidateEditorCardProps = {
  candidates: CandidateReview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sourceState: CandidateEditorProps['candidates'];
  detailState: CandidateDetailState;
  actions: CandidateActions;
};

function CandidateEditorCard(props: CandidateEditorCardProps) {
  return (
    <article className="card training-card">
      <h3>审核并发布候选题</h3>
      <p className="card-description">
        先保存审核结论，再将已通过的候选题发布到正式题库。
      </p>
      <CandidateSourceState sourceState={props.sourceState} candidates={props.candidates} />
      {props.candidates.length ? (
        <CandidateSelector
          candidates={props.candidates}
          onSelect={props.onSelect}
          selectedId={props.selectedId}
        />
      ) : null}
      {props.detailState.isLoading ? (
        <p className="form-message">正在加载候选题详情…</p>
      ) : null}
      {props.detailState.detail ? (
        <CandidateForm
          detail={props.detailState.detail}
          onChange={props.detailState.setDetail}
          {...props.actions}
        />
      ) : null}
      {props.detailState.message || props.actions.message ? (
        <EditorMessage message={props.detailState.message || props.actions.message} />
      ) : null}
    </article>
  );
}

function CandidateSourceState(props: Pick<CandidateEditorCardProps, 'sourceState' | 'candidates'>) {
  if (props.sourceState.status !== 'ready')
    return (
      <SectionFeedback state={props.sourceState} loadingMessage="正在加载候选题" />
    );
  return props.candidates.length ? null : (
    <div className="empty-state">请先导入 Markdown 资料以生成候选题。</div>
  );
}

function useCandidateDetail(selectedId: string | null) {
  const [detail, setDetail] = useState<CandidateQuestionDetail | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetail(null);
    setLoading(true);
    setMessage('');
    void getCandidateDetail(selectedId)
      .then((candidate) => active && setDetail(candidate))
      .catch((error) => active && setMessage(errorMessage(error)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selectedId]);
  return { detail, setDetail, message, isLoading };
}

type CandidateActionContext = { detailState: CandidateDetailState; onChanged: ChangeHandler };

function useCandidateActions(context: CandidateActionContext) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const execute = (action: 'save' | 'publish') =>
    executeCandidateAction({ ...context, action, setMessage, setSaving });
  return { onSave: () => execute('save'), onPublish: () => execute('publish'), saving, message };
}

type CandidateActionRequest = CandidateActionContext & {
  action: 'save' | 'publish';
  setMessage: (message: string) => void;
  setSaving: (saving: boolean) => void;
};

async function executeCandidateAction(request: CandidateActionRequest) {
  const { detail, setDetail } = request.detailState;
  if (!detail) return;
  request.setSaving(true);
  request.setMessage('');
  try {
    if (request.action === 'save') {
      setDetail(await updateCandidate(detail.id, candidateUpdateInput(detail)));
      request.setMessage('审核结果已保存。');
    } else {
      const question = await publishCandidate(detail.id);
      request.setMessage(`已发布到题库：${question.title}`);
    }
    request.onChanged();
  } catch (error) {
    request.setMessage(errorMessage(error));
  } finally {
    request.setSaving(false);
  }
}

function CandidateSelector(props: {
  candidates: CandidateReview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <label className="form-label">
      <span className="field-label-title">
        <ConsoleIcon name="list" size={15} />
        候选题目
      </span>
      <select
        value={props.selectedId ?? ''}
        onChange={(event) => props.onSelect(event.target.value)}
      >
        <option value="" disabled>
          选择候选题
        </option>
        {props.candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.title} · {statusLabel(candidate.status)}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditorMessage({ message }: { message: string }) {
  return (
    <p className="form-message" role="status">
      {message}
    </p>
  );
}
