import type { AdminApiError } from '@/lib/api';
import type { SectionState } from '@/hooks/useAdminDashboard';

type SectionFeedbackProps<T> = {
  state: SectionState<T>;
  loadingMessage?: string;
};

export function SectionFeedback<T>(props: SectionFeedbackProps<T>) {
  const { state } = props;
  if (state.status === 'ready') return null;
  if (state.status === 'loading') {
    return (
      <div className="section-state" role="status">
        <strong>{props.loadingMessage ?? '正在加载数据'}</strong>
        <span>正在通过 Product API 获取最新治理数据。</span>
      </div>
    );
  }
  if (state.status === 'forbidden') {
    return <ForbiddenState access={state.access} />;
  }
  return <ErrorState error={state.error} />;
}

function ForbiddenState({ access }: { access: 'required' | 'admin-only' }) {
  const adminOnly = access === 'admin-only';
  return (
    <div className="section-state warning" role="status">
      <strong>{adminOnly ? '仅管理员可见' : '无权访问该治理区域'}</strong>
      <span>
        {adminOnly
          ? '当前账号可继续审核题库，但没有模型、运行或审计权限。'
          : '当前账号缺少题库治理权限，请联系管理员调整角色。'}
      </span>
    </div>
  );
}

function ErrorState({ error }: { error: AdminApiError }) {
  return (
    <div className="section-state danger" role="alert">
      <strong>数据加载失败</strong>
      <span>{error.message}</span>
      {error.requestId ? <code>requestId: {error.requestId}</code> : null}
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
    <div className="console-content">
      <section className="card authentication-failure" role="alert">
        <div className="eyebrow">Authentication Required</div>
        <h2>管理端会话已失效</h2>
        <p>{props.error.message}</p>
        {props.error.requestId ? <code>requestId: {props.error.requestId}</code> : null}
        <button className="button" type="button" onClick={props.onAction}>
          {props.actionLabel}
        </button>
      </section>
    </div>
  );
}
