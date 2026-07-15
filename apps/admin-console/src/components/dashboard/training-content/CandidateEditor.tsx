import { Alert, Spin } from 'antd';
import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import { getCandidateDetail, publishCandidate, updateCandidate } from '@/lib/training-content-api';
import { CandidateForm } from './CandidateForm';
import type { CandidateEditorProps, ChangeHandler } from './types';
import { candidateUpdateInput, errorMessage } from './training-utils';

export function CandidateEditor(props: CandidateEditorProps) {
  const detailState = useCandidateDetail(props.candidateId);
  const actions = useCandidateActions({ detailState, onChanged: props.onChanged });
  return <CandidateEditorContent actions={actions} detailState={detailState} />;
}

type CandidateDetailState = ReturnType<typeof useCandidateDetail>;
type CandidateActions = ReturnType<typeof useCandidateActions>;

function CandidateEditorContent({ actions, detailState }: { actions: CandidateActions; detailState: CandidateDetailState }) {
  return (
    <div className="admin-candidate-editor">
      {detailState.isLoading ? <Spin tip="正在加载候选题详情…" /> : null}
      {detailState.detail ? <CandidateForm detail={detailState.detail} onChange={detailState.setDetail} {...actions} /> : null}
      {detailState.message ? <Alert message={detailState.message} showIcon type="error" /> : null}
      {actions.message ? <Alert message={actions.message} showIcon type={actions.messageType} /> : null}
    </div>
  );
}

function useCandidateDetail(candidateId: string) {
  const [detail, setDetail] = useState<CandidateQuestionDetail | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setLoading(true);
    setMessage('');
    void getCandidateDetail(candidateId)
      .then((candidate) => active && setDetail(candidate))
      .catch((error) => active && setMessage(errorMessage(error)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [candidateId]);
  return { detail, setDetail, message, isLoading };
}

type CandidateActionContext = { detailState: CandidateDetailState; onChanged: ChangeHandler };

function useCandidateActions(context: CandidateActionContext) {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('success');
  const [saving, setSaving] = useState(false);
  const execute = (action: 'save' | 'publish') => {
    void executeCandidateAction({ ...context, action, setMessage, setMessageType, setSaving });
  };
  return { onSave: () => execute('save'), onPublish: () => execute('publish'), saving, message, messageType };
}

type CandidateActionRequest = CandidateActionContext & {
  action: 'save' | 'publish';
  setMessage: (message: string) => void;
  setMessageType: (type: 'error' | 'success') => void;
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
    request.setMessageType('success');
    request.onChanged();
  } catch (error) {
    request.setMessageType('error');
    request.setMessage(errorMessage(error));
  } finally {
    request.setSaving(false);
  }
}
