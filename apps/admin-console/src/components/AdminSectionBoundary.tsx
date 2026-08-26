'use client';

import { Alert, Button } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type AdminSectionBoundaryProps = {
  children: ReactNode;
  /** 板块名，用于出错文案定位。 */
  section: string;
};

type AdminSectionBoundaryState = {
  hasError: boolean;
};

/** 关键板块错误边界：单个视图崩溃时保留控制台外壳，可就地重试。 */
export class AdminSectionBoundary extends Component<
  AdminSectionBoundaryProps,
  AdminSectionBoundaryState
> {
  state: AdminSectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AdminSectionBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin-section-error]', this.props.section, error, info);
  }

  private readonly handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Alert
        action={
          <Button size="small" type="primary" onClick={this.handleRetry}>
            重试
          </Button>
        }
        data-testid="admin-section-error"
        description="该板块渲染失败，其余板块不受影响。重试将重新加载此板块。"
        title={`「${this.props.section}」板块出错了`}
        showIcon
        type="error"
      />
    );
  }
}
