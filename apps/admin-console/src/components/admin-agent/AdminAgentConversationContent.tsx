import { Alert, Button, Space, Tag, Typography } from 'antd';
import type { AdminAgentRun } from '@/lib/admin-page-agent-run-api';
import { AdminAgentMessageContent } from './AdminAgentMessageContent';
import {
  executionTraceSummary,
  resolveAgentErrorPresentation,
  resolveInterruptedRunPresentation,
  retryPromptBefore,
} from './agent-drawer-model';
import type { PageAgentExecutionStep } from './admin-agent-runtime';
import type { AgentMessage } from './useAdminAgentConversation';

export function AdminAgentRunRecoveryCard(props: {
  run: AdminAgentRun | null;
  onRetry: (prompt: string, runId: string) => void;
}) {
  const presentation = resolveInterruptedRunPresentation(props.run);
  if (!presentation || !props.run) return null;
  return (
    <Alert
      action={
        <Button
          size="small"
          type="primary"
          onClick={() => props.onRetry(presentation.prompt, props.run!.id)}
        >
          {presentation.retryLabel}
        </Button>
      }
      className="admin-agent-run-recovery-card"
      description={
        <div className="admin-agent-run-recovery-detail">
          <Typography.Text>{presentation.description}</Typography.Text>
          <Typography.Text code>{presentation.prompt}</Typography.Text>
        </div>
      }
      title={presentation.title}
      showIcon
      type="warning"
    />
  );
}

export function AdminAgentRunHistory({ runs }: { runs: AdminAgentRun[] }) {
  if (!runs.length) return null;
  return (
    <details className="admin-agent-run-history">
      <summary>运行历史 · {runs.length} 条</summary>
      <ol>
        {runs.map((run) => (
          <li key={run.id}>
            <div>
              <Tag color={runStatusColor(run.status)}>{runStatusLabel(run.status)}</Tag>
              {run.retryOfRunId ? <Tag>重试任务</Tag> : null}
            </div>
            <Typography.Text type="secondary">
              {run.currentStep ?? '未记录执行步骤'}
            </Typography.Text>
          </li>
        ))}
      </ol>
    </details>
  );
}

function runStatusLabel(status: AdminAgentRun['status']) {
  return {
    running: '运行中',
    waiting_confirmation: '等待确认',
    succeeded: '已完成',
    failed: '执行失败',
    cancelled: '已取消',
    interrupted: '已中断',
  }[status];
}

function runStatusColor(status: AdminAgentRun['status']) {
  return {
    running: 'processing',
    waiting_confirmation: 'warning',
    succeeded: 'success',
    failed: 'error',
    cancelled: 'default',
    interrupted: 'warning',
  }[status];
}

export function AdminAgentExecutionTrace({ steps }: { steps: PageAgentExecutionStep[] }) {
  const summary = executionTraceSummary(steps);
  if (!summary) return null;
  return (
    <details className="admin-agent-execution-trace" id="admin-agent-execution-trace">
      <summary>
        <span>执行过程</span>
        <span className={`is-${summary.state}`}>{summary.label}</span>
      </summary>
      <ol>
        {steps.map((step, index) => (
          <li className={`is-${step.state}`} key={`${step.key}-${index}`}>
            {step.label}
          </li>
        ))}
      </ol>
    </details>
  );
}

export function AdminAgentMessageList(props: {
  messages: AgentMessage[];
  hasTrace: boolean;
  onRetry: (value: string) => void;
}) {
  return (
    <div className="admin-agent-message-list" role="list">
      {props.messages.map((item, index) => (
        <div
          className={`admin-agent-message admin-agent-message-${item.role}`}
          key={item.id}
          role="listitem"
        >
          <MessageContent
            hasTrace={props.hasTrace}
            item={item}
            retryPrompt={retryPromptBefore(props.messages, index)}
            onRetry={props.onRetry}
          />
        </div>
      ))}
    </div>
  );
}

type MessageContentProps = {
  item: AgentMessage;
  retryPrompt: string | null;
  hasTrace: boolean;
  onRetry: (value: string) => void;
};

function MessageContent(props: MessageContentProps) {
  if (props.item.role === 'assistant')
    return <AdminAgentMessageContent content={props.item.content} />;
  if (props.item.role === 'error') return <AgentErrorMessage {...props} />;
  return <Typography.Text>{props.item.content}</Typography.Text>;
}

function AgentErrorMessage(props: MessageContentProps) {
  const presentation = resolveAgentErrorPresentation(props.item.content);
  return (
    <Alert
      action={<RecoveryActions {...props} retryLabel={presentation.retryLabel} />}
      className="admin-agent-error-card"
      description={presentation.description}
      title={presentation.title}
      showIcon
      type={presentation.type}
    />
  );
}

function RecoveryActions(props: MessageContentProps & { retryLabel: string }) {
  return (
    <Space size={4} wrap>
      {props.retryPrompt ? (
        <Button size="small" onClick={() => props.onRetry(props.retryPrompt!)}>
          {props.retryLabel}
        </Button>
      ) : null}
      {props.hasTrace ? (
        <Button size="small" type="link" onClick={revealExecutionTrace}>
          查看执行过程
        </Button>
      ) : null}
    </Space>
  );
}

function revealExecutionTrace() {
  const element = document.getElementById('admin-agent-execution-trace');
  if (element instanceof HTMLDetailsElement) element.open = true;
  element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
