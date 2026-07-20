import { useEffect } from 'react';
import type { AgentStatus } from '@page-agent/core';
import type { UserAgentConversationSummary } from '@/lib/user-agent-conversation-api';
import type { UserPageAgentConfig } from '@/lib/user-page-agent-api';
import { UserAgentComposer } from './UserAgentComposer';
import { UserAgentConversationSidebar } from './UserAgentConversationSidebar';
import { userAgentQuickActions } from './user-agent-quick-actions';
import type { UserAgentMessage } from './useUserAgentConversation';

type Props = {
  open: boolean;
  config: UserPageAgentConfig | null;
  loading: boolean;
  conversationLoading: boolean;
  conversationError: string | null;
  conversations: UserAgentConversationSummary[];
  activeConversationId: string | null;
  status: AgentStatus;
  activity: string;
  tokens: number;
  messages: UserAgentMessage[];
  pendingQuestion: string | null;
  onClose: () => void;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  onSetup: () => void;
  onAnswer: (answer: string) => void;
  onSend: (value: string) => void;
  onStop: () => void;
};

export function UserAgentDrawer(props: Props) {
  useEffect(() => {
    if (!props.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.onClose, props.open]);
  if (!props.open) return null;
  return (
    <div className="user-agent-layer" data-page-agent-not-interactive="true">
      <button aria-label="关闭 AI 刷题教练" className="user-agent-backdrop" type="button" onClick={props.onClose} />
      <section aria-label="AI 刷题教练" aria-modal="true" className="user-agent-drawer" role="dialog">
        <DrawerHeader config={props.config} onClose={props.onClose} onSetup={props.onSetup} />
        <div className="user-agent-drawer-body">
          <UserAgentConversationSidebar
            activeId={props.activeConversationId}
            conversations={props.conversations}
            loading={props.conversationLoading}
            onCreate={props.onCreateConversation}
            onDelete={props.onDeleteConversation}
            onRename={props.onRenameConversation}
            onSelect={props.onSelectConversation}
          />
          <ChatPane {...props} />
        </div>
      </section>
    </div>
  );
}

function DrawerHeader(props: {
  config: UserPageAgentConfig | null;
  onClose: () => void;
  onSetup: () => void;
}) {
  return (
    <header className="user-agent-drawer-header">
      <span className="user-agent-header-mark" aria-hidden="true">✦</span>
      <div>
        <strong>AI 刷题教练</strong>
        <small>结合你的岗位、档案和练习记录</small>
      </div>
      {props.config?.model ? <span className="user-agent-model">{props.config.model}</span> : null}
      <button className="user-agent-header-action" type="button" onClick={props.onSetup}>模型</button>
      <button aria-label="关闭" className="user-agent-close" type="button" onClick={props.onClose}>×</button>
    </header>
  );
}

function ChatPane(props: Props) {
  const currentTitle = props.conversations.find((item) => item.id === props.activeConversationId)?.title ?? '新对话';
  return (
    <main className="user-agent-chat-pane">
      <div className={`user-agent-status${props.status === 'running' ? ' is-running' : ''}`}>
        <span aria-hidden="true" />
        <p><strong>{props.activity}</strong><small>涉及模型消耗或提交操作时，我会先请你确认。</small></p>
      </div>
      {props.pendingQuestion ? <Confirmation question={props.pendingQuestion} onAnswer={props.onAnswer} /> : null}
      {props.conversationError ? <p className="user-agent-error">{props.conversationError}</p> : null}
      {props.loading ? <div className="user-agent-loading">正在连接刷题教练…</div> : null}
      {!props.loading && !props.config?.enabled ? <SetupState message={props.config?.message} onSetup={props.onSetup} /> : null}
      {!props.loading && props.config?.enabled ? (
        <Conversation
          activity={props.activity}
          busy={props.status === 'running' || props.conversationLoading || !props.activeConversationId}
          currentTitle={currentTitle}
          messages={props.messages}
          onSend={props.onSend}
          onStop={props.onStop}
          tokens={props.tokens}
        />
      ) : null}
    </main>
  );
}

function Confirmation(props: { question: string; onAnswer: (answer: string) => void }) {
  return (
    <div className="user-agent-confirmation">
      <div><strong>需要你的确认</strong><p>{props.question}</p></div>
      <div>
        <button type="button" onClick={() => props.onAnswer('用户确认继续。')}>确认继续</button>
        <button type="button" onClick={() => props.onAnswer('用户取消本次操作。')}>取消</button>
      </div>
    </div>
  );
}

function SetupState(props: { message: string | null | undefined; onSetup: () => void }) {
  return (
    <div className="user-agent-setup-state">
      <span aria-hidden="true">✦</span>
      <strong>连接模型后开始训练</strong>
      <p>{props.message ?? '当前账号还没有可用的 AI 模型连接。'}</p>
      <button type="button" onClick={props.onSetup}>去连接模型</button>
    </div>
  );
}

function Conversation(props: {
  activity: string;
  busy: boolean;
  currentTitle: string;
  messages: UserAgentMessage[];
  onSend: (value: string) => void;
  onStop: () => void;
  tokens: number;
}) {
  return (
    <>
      <div className="user-agent-chat-heading"><strong>{props.currentTitle}</strong><span>当前训练对话</span></div>
      {props.messages.length ? <MessageList messages={props.messages} /> : <QuickActions busy={props.busy} onSend={props.onSend} />}
      <div className="user-agent-metrics"><span>{props.activity}</span><span>本轮约 {props.tokens.toLocaleString()} tokens</span></div>
      <UserAgentComposer busy={props.busy} onSend={props.onSend} onStop={props.onStop} />
    </>
  );
}

function MessageList({ messages }: { messages: UserAgentMessage[] }) {
  return (
    <div className="user-agent-message-list">
      {messages.map((item) => (
        <article className={`user-agent-message is-${item.role}`} key={item.id}>
          <span>{item.role === 'user' ? '你' : item.role === 'assistant' ? '教练' : '提示'}</span>
          <div>{item.content.split('\n').map((line, index) => <p key={`${item.id}-${index}`}>{line || ' '}</p>)}</div>
        </article>
      ))}
    </div>
  );
}

function QuickActions(props: { busy: boolean; onSend: (value: string) => void }) {
  return (
    <section className="user-agent-quick-actions" aria-label="常用训练建议">
      <div><span className="user-agent-eyebrow">从训练目标开始</span><h2>今天想解决什么？</h2><p>我会先读取你的训练线索，再给出下一步。</p></div>
      <div className="user-agent-quick-grid">
        {userAgentQuickActions.map((action) => (
          <button disabled={props.busy} key={action.id} type="button" onClick={() => props.onSend(action.prompt)}>
            <span aria-hidden="true">✦</span><strong>{action.title}</strong><small>{action.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
