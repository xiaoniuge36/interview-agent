'use client';

import { Button, Result } from 'antd';
import { useEffect } from 'react';

type AdminRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminRouteError({ error, reset }: AdminRouteErrorProps) {
  useEffect(() => {
    console.error('[admin-route-error]', error);
  }, [error]);

  return (
    <main className="admin-route-error" role="alert" data-testid="admin-route-error">
      <Result
        status="error"
        title="控制台没有加载成功"
        subTitle={
          error.digest
            ? `渲染中断，错误编号 ${error.digest}。重试通常可以恢复。`
            : '渲染中断。重试通常可以恢复；若持续出现请刷新页面。'
        }
        extra={[
          <Button key="retry" type="primary" onClick={reset}>
            重试
          </Button>,
          <Button key="reload" onClick={() => window.location.reload()}>
            刷新页面
          </Button>,
        ]}
      />
    </main>
  );
}
