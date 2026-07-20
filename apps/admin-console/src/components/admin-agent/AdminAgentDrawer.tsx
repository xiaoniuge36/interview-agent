import {
  AlertOutlined,
  AuditOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Alert, Button, Drawer, Empty, List, Space, Spin, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { AgentStatus } from '@page-agent/core';
import type { AdminAgentConversationSummary } from '@/lib/admin-page-agent-conversation-api';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';
import { AdminAgentComposer } from './AdminAgentComposer';
import { AdminAgentConversationSidebar } from './AdminAgentConversationSidebar';
import { AdminAgentMessageContent } from './AdminAgentMessageContent';
import { adminAgentQuickActions, type AdminAgentQuickActionId } from './admin-agent-quick-actions';
import type { AgentMessage } from './useAdminAgentConversation';

export function AdminAgentDrawer(props: Props) {
  return (
    <Drawer
      className="admin-agent-drawer"
      destroyOnClose={false}
      extra={<DrawerExtra model={props.config?.model} onSetup={props.onSetup} />}
      onClose={props.onClose}
      open={props.open}
      title="智能运营助手"
      width={760}
    >
      <DrawerBody {...props} />
    </Drawer>
  );
}

type Props = {
  open: boolean;
  config: AdminPageAgentConfig | null;
  loading: boolean;
  conversationLoading: boolean;
  conversationError: string | null;
  conversations: AdminAgentConversationSummary[];
  activeConversationId: string | null;
  status: AgentStatus;
  activity: string;
  tokens: number;
  messages: AgentMessage[];
  pendingQuestion: string | null;
  onClose: () => void;
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onSetup: () => void;
  onAnswer: (answer: string) => void;
  onSend: (value: string) => void;
  onStop: () => void;
};

function DrawerExtra({
  model,
  onSetup,
}: {
  model: string | null | undefined;
  onSetup: () => void;
}) {
  return (
    <Space size={6}>
      {model ? <Tag color="blue">{model}</Tag> : null}
      <Button aria-label="设置模型连接" icon={<SettingOutlined />} type="text" onClick={onSetup} />
    </Space>
  );
}

function DrawerBody(props: Props) {
  return (
    <div className="admin-agent-drawer-content" data-page-agent-not-interactive="true">
      <AdminAgentConversationSidebar
        activeId={props.activeConversationId}
        conversations={props.conversations}
        loading={props.conversationLoading}
        onCreate={props.onCreateConversation}
        onDelete={props.onDeleteConversation}
        onRename={props.onRenameConversation}
        onSelect={props.onSelectConversation}
      />
      <main className="admin-agent-chat-pane">
        <StatusAlert status={props.status} activity={props.activity} />
        {props.pendingQuestion ? (
          <QuestionAlert question={props.pendingQuestion} onAnswer={props.onAnswer} />
        ) : null}
        {props.conversationError ? (
          <Alert
            description={props.conversationError}
            message="历史对话加载失败"
            showIcon
            type="error"
          />
        ) : null}
        {props.loading ? <Spin className="admin-agent-loading" /> : null}
        <ConditionalContent {...props} />
      </main>
    </div>
  );
}

function StatusAlert({ status, activity }: { status: AgentStatus; activity: string }) {
  const message = status === 'running' ? activity : '从一项运营查询开始';
  return (
    <Alert
      banner
      description="我会先查询、定位和带你进入对应页面；审核、发布、导出和账号修改仍由你确认执行。"
      message={message}
      type={status === 'error' ? 'error' : 'info'}
    />
  );
}

function ConditionalContent(props: Props) {
  if (props.loading) return null;
  if (props.config?.enabled) return <Conversation {...props} />;
  return <SetupEmpty message={props.config?.message ?? null} onSetup={props.onSetup} />;
}

function QuestionAlert({
  question,
  onAnswer,
}: {
  question: string;
  onAnswer: (value: string) => void;
}) {
  return (
    <Alert
      action={
        <Space>
          <Button size="small" onClick={() => onAnswer('用户确认继续。')} type="primary">
            确认继续
          </Button>
          <Button size="small" onClick={() => onAnswer('用户拒绝继续。')}>
            取消
          </Button>
        </Space>
      }
      description={question}
      message="Agent 需要你的确认"
      type="warning"
    />
  );
}

function SetupEmpty({ message, onSetup }: { message: string | null; onSetup: () => void }) {
  return (
    <Empty description={message ?? '当前后台账号尚未连接模型'}>
      <Button type="primary" onClick={onSetup}>
        连接模型
      </Button>
    </Empty>
  );
}

function Conversation(props: Props) {
  const showQuickActions = props.messages.length === 0;
  const busy =
    props.status === 'running' || props.conversationLoading || !props.activeConversationId;
  return (
    <>
      <div className="admin-agent-chat-heading">
        <Typography.Text strong>
          {props.conversations.find((item) => item.id === props.activeConversationId)?.title ??
            '新对话'}
        </Typography.Text>
        <Typography.Text type="secondary">当前会话</Typography.Text>
      </div>
      {showQuickActions ? (
        <QuickActions busy={busy} onSend={props.onSend} />
      ) : (
        <MessageList messages={props.messages} />
      )}
      <div className="admin-agent-status-row">
        <Typography.Text type="secondary">{props.activity}</Typography.Text>
        <Typography.Text type="secondary">
          本轮约 {props.tokens.toLocaleString()} tokens
        </Typography.Text>
      </div>
      <AdminAgentComposer busy={busy} onSend={props.onSend} onStop={props.onStop} />
    </>
  );
}

function MessageList({ messages }: { messages: AgentMessage[] }) {
  return (
    <List
      className="admin-agent-message-list"
      dataSource={messages}
      renderItem={(item) => (
        <List.Item className={`admin-agent-message admin-agent-message-${item.role}`}>
          <MessageContent item={item} />
        </List.Item>
      )}
    />
  );
}

function QuickActions({ busy, onSend }: { busy: boolean; onSend: (value: string) => void }) {
  return (
    <section aria-label="常用运营查询" className="admin-agent-quick-actions">
      <div className="admin-agent-quick-actions-heading">
        <Typography.Text strong>常用运营查询</Typography.Text>
        <Typography.Text type="secondary">从一个问题开始，结果会保留在本轮对话中。</Typography.Text>
      </div>
      <div className="admin-agent-quick-actions-grid">
        {adminAgentQuickActions.map((action) => (
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

function QuickActionIcon({ id }: { id: AdminAgentQuickActionId }) {
  const icons: Record<AdminAgentQuickActionId, ReactNode> = {
    'pending-imports': <FileSearchOutlined />,
    'pending-candidates': <AuditOutlined />,
    'runtime-health': <AlertOutlined />,
    dashboard: <DashboardOutlined />,
  };
  return (
    <span aria-hidden="true" className="admin-agent-quick-action-icon">
      {icons[id]}
    </span>
  );
}

function MessageContent({ item }: { item: AgentMessage }) {
  if (item.role === 'assistant') return <AdminAgentMessageContent content={item.content} />;
  return <Typography.Text>{item.content}</Typography.Text>;
}
