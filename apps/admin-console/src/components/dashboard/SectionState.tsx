import { Alert, Button, Result, Spin, Typography } from 'antd';
import type { AdminApiError } from '@/lib/api';
import type { SectionState } from '@/hooks/useAdminDashboard';

type SectionFeedbackProps<T> = {
  state: SectionState<T>;
  loadingMessage?: string;
};

export function SectionFeedback<T>(props: SectionFeedbackProps<T>) {
  const { state } = props;
  if (state.status === 'ready') return null;
  if (state.status === 'loading') return <Spin className="admin-section-spin" tip={props.loadingMessage ?? '正在加载数据'} />;
  if (state.status === 'forbidden') return <ForbiddenState access={state.access} />;
  return <ErrorState error={state.error} />;
}

function ForbiddenState({ access }: { access: 'required' | 'admin-only' }) {
  const adminOnly = access === 'admin-only';
  return (
    <Result
      status="403"
      subTitle={adminOnly ? '当前账号可继续审核题库，但没有模型、运行或审计权限。' : '当前账号缺少题库治理权限，请联系管理员调整角色。'}
      title={adminOnly ? '仅管理员可见' : '无权访问该治理区域'}
    />
  );
}

function ErrorState({ error }: { error: AdminApiError }) {
  return (
    <Alert
      showIcon
      description={<ErrorDescription error={error} />}
      message="数据加载失败"
      type="error"
    />
  );
}

function ErrorDescription({ error }: { error: AdminApiError }) {
  return (
    <div className="admin-error-description">
      <div>{error.message}</div>
      {error.requestId ? <Typography.Text code>requestId: {error.requestId}</Typography.Text> : null}
    </div>
  );
}

type AuthenticationFailureProps = {
  error: AdminApiError;
  actionLabel: string;
  onAction: () => void;
};

export function AuthenticationFailure(props: AuthenticationFailureProps) {
  return (
    <div className="admin-page">
      <Result
        extra={
          <Button type="primary" onClick={props.onAction}>
            {props.actionLabel}
          </Button>
        }
        status="403"
        subTitle={props.error.message}
        title="管理端会话已失效"
      />
    </div>
  );
}
