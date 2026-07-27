import { HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Space, Spin, Tag, Typography } from 'antd';
import { useState } from 'react';
import type { AgentStatus } from '@page-agent/core';
import type { AdminAgentConversationSummary } from '@/lib/admin-page-agent-conversation-api';
import type { AdminAgentRun } from '@/lib/admin-page-agent-run-api';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';
import { AdminAgentComposer } from './AdminAgentComposer';
import {
  AdminAgentExecutionTrace,
  AdminAgentMessageList,
  AdminAgentRunRecoveryCard,
  AdminAgentRunHistory,
} from './AdminAgentConversationContent';
import { AdminAgentConversationSidebar } from './AdminAgentConversationSidebar';
import { AdminAgentQuickActions } from './AdminAgentQuickActions';
import type { AdminAgentPageContext } from './admin-agent-page-context';
import { shouldExpandAgentContext } from './agent-drawer-model';
import type { PageAgentExecutionStep } from './admin-agent-runtime';
import type { AgentMessage } from './useAdminAgentConversation';

export type AdminAgentDrawerContentProps = {
  config: AdminPageAgentConfig | null;
  loading: boolean;
  conversationLoading: boolean;
  conversationError: string | null;
  conversations: AdminAgentConversationSummary[];
  activeConversationId: string | null;
  status: AgentStatus;
  activity: string;
  executionSteps: PageAgentExecutionStep[];
  tokens: number;
  messages: AgentMessage[];
  latestRun: AdminAgentRun | null;
  runHistory: AdminAgentRun[];
  runError: string | null;
  pendingQuestion: string | null;
  pageContext: AdminAgentPageContext;
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onSetup: () => void;
  onAnswer: (answer: string) => void;
  onSend: (value: string) => void;
  onRetry: (value: string, runId?: string) => void;
  onStop: () => void;
};

export function AdminAgentDrawerContent(props: AdminAgentDrawerContentProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <div className="admin-agent-drawer-content" data-page-agent-not-interactive="true">
      {historyOpen ? <ConversationHistory {...props} /> : null}
      <main className="admin-agent-chat-pane">
        <ConversationToolbar
          busy={isAgentBusy(props)}
          historyOpen={historyOpen}
          title={activeConversationTitle(props)}
          onCreate={props.onCreateConversation}
          onToggleHistory={() => setHistoryOpen((current) => !current)}
        />
        <AgentContextBanner {...props} />
        {props.pendingQuestion ? (
          <QuestionAlert question={props.pendingQuestion} onAnswer={props.onAnswer} />
        ) : null}
        {props.conversationError ? (
          <ConversationLoadError message={props.conversationError} />
        ) : null}
        {props.runError ? <RunSyncError message={props.runError} /> : null}
        <AdminAgentRunRecoveryCard run={props.latestRun} onRetry={props.onRetry} />
        <AdminAgentRunHistory runs={props.runHistory} />
        {props.loading ? <Spin className="admin-agent-loading" /> : null}
        <ConditionalContent {...props} />
      </main>
    </div>
  );
}

function ConversationHistory(props: AdminAgentDrawerContentProps) {
  return (
    <AdminAgentConversationSidebar
      activeId={props.activeConversationId}
      conversations={props.conversations}
      loading={props.conversationLoading}
      disabled={isAgentBusy(props)}
      onCreate={props.onCreateConversation}
      onDelete={props.onDeleteConversation}
      onRename={props.onRenameConversation}
      onSelect={props.onSelectConversation}
    />
  );
}

function ConversationToolbar(props: {
  busy: boolean;
  historyOpen: boolean;
  title: string;
  onCreate: () => void;
  onToggleHistory: () => void;
}) {
  return (
    <div className="admin-agent-chat-heading">
      <div>
        <Typography.Text strong>{props.title}</Typography.Text>
        <Typography.Text type="secondary">当前会话</Typography.Text>
      </div>
      <Space size={4}>
        <Button
          disabled={props.busy}
          icon={<PlusOutlined />}
          size="small"
          type="text"
          onClick={props.onCreate}
        >
          新对话
        </Button>
        <Button
          aria-label={props.historyOpen ? '收起历史对话' : '打开历史对话'}
          icon={<HistoryOutlined />}
          size="small"
          type={props.historyOpen ? 'default' : 'text'}
          onClick={props.onToggleHistory}
        >
          历史
        </Button>
      </Space>
    </div>
  );
}

function AgentContextBanner(props: AdminAgentDrawerContentProps) {
  if (!shouldExpandAgentContext(props.messages, props.status)) {
    return (
      <div className="admin-agent-context-compact">
        <Tag color="blue">当前页面</Tag>
        <Typography.Text strong>{props.pageContext.title}</Typography.Text>
        <Typography.Text type="secondary">只读查询，敏感操作仍需人工确认</Typography.Text>
      </div>
    );
  }
  return (
    <Alert
      banner
      description="我会先查询、定位并带你进入对应页面；审核、发布、导出和账号修改仍由你确认执行。"
      title={props.status === 'running' ? props.activity : props.pageContext.title}
      showIcon
      type={props.status === 'error' ? 'error' : 'info'}
    />
  );
}

function ConversationLoadError({ message }: { message: string }) {
  return <Alert description={message} title="历史对话加载失败" showIcon type="error" />;
}

function RunSyncError({ message }: { message: string }) {
  return <Alert description={message} title="运行状态同步异常" showIcon type="warning" />;
}

function ConditionalContent(props: AdminAgentDrawerContentProps) {
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
          <Button size="small" type="primary" onClick={() => onAnswer('用户确认继续。')}>
            确认继续
          </Button>
          <Button size="small" onClick={() => onAnswer('用户拒绝继续。')}>
            取消
          </Button>
        </Space>
      }
      description={question}
      title="Agent 需要你的确认"
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

function Conversation(props: AdminAgentDrawerContentProps) {
  const showQuickActions = props.messages.length === 0;
  const busy = isAgentBusy(props);
  return (
    <>
      <AdminAgentExecutionTrace steps={props.executionSteps} />
      {showQuickActions ? (
        <AdminAgentQuickActions busy={busy} context={props.pageContext} onSend={props.onSend} />
      ) : (
        <AdminAgentMessageList
          hasTrace={props.executionSteps.length > 0}
          messages={props.messages}
          onRetry={(value) => props.onRetry(value, retryableRunId(props.latestRun))}
        />
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

function activeConversationTitle(props: AdminAgentDrawerContentProps) {
  return (
    props.conversations.find((item) => item.id === props.activeConversationId)?.title ?? '新对话'
  );
}

function isActiveRun(run: AdminAgentRun | null) {
  return run?.status === 'running' || run?.status === 'waiting_confirmation';
}

function isAgentBusy(props: AdminAgentDrawerContentProps) {
  return (
    props.status === 'running' ||
    isActiveRun(props.latestRun) ||
    props.conversationLoading ||
    !props.activeConversationId
  );
}

function retryableRunId(run: AdminAgentRun | null) {
  return run && ['failed', 'cancelled', 'interrupted'].includes(run.status) ? run.id : undefined;
}
