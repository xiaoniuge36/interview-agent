import {
  AlertOutlined,
  AuditOutlined,
  DashboardOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { Button, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { AdminAgentPageContext } from './admin-agent-page-context';

export function AdminAgentQuickActions({
  busy,
  context,
  onSend,
}: {
  busy: boolean;
  context: AdminAgentPageContext;
  onSend: (value: string) => void;
}) {
  return (
    <section aria-label="常用运营查询" className="admin-agent-quick-actions">
      <div className="admin-agent-quick-actions-heading">
        <Typography.Text strong>{context.title}</Typography.Text>
        <Typography.Text type="secondary">{context.description}</Typography.Text>
      </div>
      <div className="admin-agent-quick-actions-grid">
        {context.quickActions.map((action) => (
          <Button
            className="admin-agent-quick-action"
            disabled={busy}
            key={action.id}
            onClick={() => onSend(action.prompt)}
          >
            <QuickActionIcon id={action.id} />
            <span>
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}

function QuickActionIcon({ id }: { id: string }) {
  const icons: Record<string, ReactNode> = {
    'pending-imports': <FileSearchOutlined />,
    'pending-candidates': <AuditOutlined />,
    'runtime-health': <AlertOutlined />,
    dashboard: <DashboardOutlined />,
  };
  return (
    <span aria-hidden="true" className="admin-agent-quick-action-icon">
      {icons[id] ?? <DashboardOutlined />}
    </span>
  );
}
