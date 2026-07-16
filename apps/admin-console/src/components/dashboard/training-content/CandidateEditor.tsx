import { Alert, Card, Empty, Spin, Typography } from 'antd';
import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import { getCandidateDetail, publishCandidate, updateCandidate } from '@/lib/training-content-api';
import { CandidateForm } from './CandidateForm';
import { ImportReviewContext } from './ImportReviewContext';
import type { CandidateEditorProps, ChangeHandler } from './types';
import { candidateUpdateInput } from './training-utils';

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
      {detailState.isLoading ? <Spin description="正在加载候选题详情…" /> : null}
      {detailState.detail ? (
        <>
          <CandidateSourceContext importTaskId={detailState.detail.importTaskId} />
          <CandidateForm detail={detailState.detail} onChange={detailState.setDetail} {...actions} />
        </>
      ) : null}
      {detailState.hasError ? <Empty description="暂无可展示的候选题详情。" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
      {actions.message ? <Alert message={actions.message} showIcon type="success" /> : null}
    </div>
  );
}

function CandidateSourceContext({ importTaskId }: { importTaskId: string | null }) {
  if (importTaskId) return <ImportReviewContext active importTaskId={importTaskId} />;
  return (
    <Card className="admin-import-review-context" size="small" title="来源资料">
      <Typography.Text type="secondary">非导入来源</Typography.Text>
    </Card>
  );
}

function useCandidateDetail(candidateId: string) {
  const [detail, setDetail] = useState<CandidateQuestionDetail | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setLoading(true);
    setHasError(false);
    void getCandidateDetail(candidateId)
      .then((candidate) => active && setDetail(candidate))
      .catch(() => active && setHasError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [candidateId]);
  return { detail, setDetail, hasError, isLoading };
}

type CandidateActionContext = { detailState: CandidateDetailState; onChanged: ChangeHandler };

function useCandidateActions(context: CandidateActionContext) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const execute = (action: 'save' | 'publish') => {
    void executeCandidateAction({ ...context, action, setMessage, setSaving });
  };
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
  } catch {
    // 统一请求层会显示操作失败提示；此处仅结束提交状态。
  } finally {
    request.setSaving(false);
  }
}
