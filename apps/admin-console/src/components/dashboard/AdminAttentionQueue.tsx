import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Card, Empty, List, Tag, Typography } from 'antd';
import type { Dashboard } from '@interview-agent/contracts';
import type { AdminView } from '@/components/admin-navigation';
import { getAdminAttentionItems } from './admin-attention-queue';

export function AdminAttentionQueue({
  dashboard,
  onNavigate,
}: {
  dashboard: Dashboard;
  onNavigate: (view: AdminView) => void;
}) {
  const items = getAdminAttentionItems(dashboard);
  return (
    <Card className="admin-dense-card admin-attention-card" title="需处理事项">
      {items.length ? <AttentionList items={items} onNavigate={onNavigate} /> : <HealthyQueue />}
    </Card>
  );
}

function AttentionList({
  items,
  onNavigate,
}: {
  items: ReturnType<typeof getAdminAttentionItems>;
  onNavigate: (view: AdminView) => void;
}) {
  return (
    <List
      dataSource={items}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button key={item.id} type="link" onClick={() => onNavigate(item.view)}>
              处理
            </Button>,
          ]}
        >
          <List.Item.Meta
            avatar={
              <ExclamationCircleOutlined className={`admin-attention-icon ${item.severity}`} />
            }
            description={item.description}
            title={<Typography.Text strong>{item.title}</Typography.Text>}
          />
          <Tag color={item.severity === 'error' ? 'error' : 'warning'}>{item.count}</Tag>
        </List.Item>
      )}
    />
  );
}

function HealthyQueue() {
  return (
    <Empty
      description="当前没有需要升级处理的治理事项。"
      image={<CheckCircleOutlined className="admin-attention-icon healthy" />}
      imageStyle={{ fontSize: 28, height: 32 }}
    />
  );
}
