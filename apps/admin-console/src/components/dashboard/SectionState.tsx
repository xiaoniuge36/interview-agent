import { Button, Empty, Result, Spin } from 'antd';
import * as React from 'react';
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
      <div aria-busy="true" className="admin-section-loading" role="status">
        <Spin className="admin-section-spin" description={props.loadingMessage ?? '正在加载数据'} />
      </div>
    );
  }
  if (state.status === 'forbidden') return <ForbiddenState access={state.access} />;
  return <ErrorState />;
}

function ForbiddenState({ access }: { access: 'required' | 'admin-only' | 'platform-only' }) {
  if (access === 'platform-only') {
    return (
      <Result
        status="403"
        subTitle="数据看板与账号治理仅对平台管理员开放，请联系平台管理员调整角色。"
        title="仅平台管理员可见"
      />
    );
  }
  const adminOnly = access === 'admin-only';
  return (
    <Result
      status="403"
      subTitle={
        adminOnly
          ? '当前账号可继续审核题库，但没有模型、运行或审计权限。'
          : '当前账号缺少题库治理权限，请联系管理员调整角色。'
      }
      title={adminOnly ? '仅管理员可见' : '无权访问该治理区域'}
    />
  );
}

function ErrorState() {
  return (
    <Empty
      className="admin-section-empty"
      description="暂无可展示数据"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
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
