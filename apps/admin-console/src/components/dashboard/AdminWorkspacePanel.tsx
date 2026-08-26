'use client';

import { StarOutlined } from '@ant-design/icons';
import { useAuth } from '@interview-agent/auth-client';
import { Button, Card, Empty, Space, Typography } from 'antd';
import {
  ADMIN_NAV_ITEMS,
  canAccessAdminView,
  type AdminNavigationItem,
  type AdminView,
} from '@/components/admin-navigation';
import { useAdminWorkspace } from '@/components/admin-workspace-context';

const WORKSPACE_ACTION_GAP = 6;

export function AdminWorkspacePanel({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  const auth = useAuth();
  const { preferences } = useAdminWorkspace();
  const favorites = workspaceItems(preferences.favorites, auth.identity?.role);
  const recent = workspaceItems(preferences.recentViews, auth.identity?.role);
  return (
    <Card className="admin-dense-card admin-workspace-panel" title="我的工作台">
      <WorkspaceGroup items={favorites} label="收藏模块" onNavigate={onNavigate} />
      <WorkspaceGroup items={recent} label="最近访问" onNavigate={onNavigate} />
    </Card>
  );
}

function WorkspaceGroup({
  items,
  label,
  onNavigate,
}: {
  items: AdminNavigationItem[];
  label: string;
  onNavigate: (view: AdminView) => void;
}) {
  return (
    <div className="admin-workspace-group">
      <Typography.Text type="secondary">{label}</Typography.Text>
      {items.length ? (
        <Space size={[WORKSPACE_ACTION_GAP, WORKSPACE_ACTION_GAP]} wrap>
          {items.map((item) => (
            <Button key={item.id} size="small" onClick={() => onNavigate(item.id)}>
              {item.label}
            </Button>
          ))}
        </Space>
      ) : (
        <Empty
          description={`暂未${label}，可在页面标题旁点击收藏。`}
          image={<StarOutlined />}
          styles={{ image: { fontSize: 24, height: 28 } }}
        />
      )}
    </div>
  );
}

function workspaceItems(views: readonly AdminView[], role: string | undefined) {
  return views
    .map((view) => ADMIN_NAV_ITEMS.find((item) => item.id === view))
    .filter((item): item is AdminNavigationItem => Boolean(item))
    .filter((item) => canAccessAdminView(role, item.id));
}
