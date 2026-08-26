'use client';

import { useAuth } from '@interview-agent/auth-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentStatus, PageAgentCore } from '@page-agent/core';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';
import type { AdminView } from '@/components/admin-navigation';
import { AdminAgentCredentialManager } from './AdminAgentCredentialManager';
import { AdminAgentDrawer } from './AdminAgentDrawer';
import { useAdminAgentConfig } from './useAdminAgentConfig';
import { useAdminAgentConversation } from './useAdminAgentConversation';
import { useAdminAgentConversations } from './useAdminAgentConversations';
import { useAdminAgentRuntime } from './useAdminAgentRuntime';
import { useAdminAgentRunRecovery } from './useAdminAgentRunRecovery';
import { formatAdminAgentConversationContext } from './admin-agent-runtime';
import { resolveAdminAgentPageContext } from './admin-agent-page-context';

const EMPTY_CONVERSATION_MESSAGES: never[] = [];

export type AdminAgentWidgetBodyProps = {
  activeView: AdminView;
  open: boolean;
  onRequestClose: () => void;
  onStatusChange: (status: AgentStatus) => void;
};

/** 浮窗主体：首次打开后挂载，负责 config/会话/运行时的完整 bootstrap。 */
export function AdminAgentWidgetBody(props: AdminAgentWidgetBodyProps) {
  const role = useAuth().identity?.role;
  const pageContext = resolveAdminAgentPageContext(props.activeView, role);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const { config, loading, reloadConfig } = useAdminAgentConfig(true);
  const conversations = useAdminAgentConversations(true);
  const task = useAdminAgentTaskController({ config, conversations, pageContext, role });
  const openModelManager = useCallback(() => setModelManagerOpen(true), []);
  useStatusReporting(task.runtime.status, props.onStatusChange);
  return (
    <AdminAgentWidgetView
      config={config}
      conversations={conversations}
      loading={loading}
      modelManagerOpen={modelManagerOpen}
      onClose={props.onRequestClose}
      onModelManagerClose={() => setModelManagerOpen(false)}
      onModelManagerOpen={openModelManager}
      onReloadConfig={reloadConfig}
      open={props.open}
      pageContext={pageContext}
      {...task}
    />
  );
}

function useStatusReporting(status: AgentStatus, onStatusChange: (status: AgentStatus) => void) {
  useEffect(() => {
    onStatusChange(status);
  }, [onStatusChange, status]);
}

function useAdminAgentTaskController(options: {
  config: AdminPageAgentConfig | null;
  conversations: ReturnType<typeof useAdminAgentConversations>;
  pageContext: ReturnType<typeof resolveAdminAgentPageContext>;
  role: string | undefined;
}) {
  const agentRef = useRef<PageAgentCore | null>(null);
  const runs = useAdminAgentRunRecovery(options.conversations.activeId);
  const runLifecycle = useMemo(
    () => ({ startRun: runs.startRun, completeRun: runs.completeRun }),
    [runs.completeRun, runs.startRun],
  );
  const conversation = useAdminAgentConversation(agentRef, options.config, {
    conversationId: options.conversations.activeId,
    initialMessages:
      options.conversations.activeConversation?.messages ?? EMPTY_CONVERSATION_MESSAGES,
    persistMessages: options.conversations.persistMessages,
    runLifecycle,
  });
  const askUser = useTrackedAskUser(conversation.askUser, runs.markWaiting, runs.markRunning);
  const runtime = useAdminAgentRuntime({
    enabled: true,
    config: options.config,
    conversationId: options.conversations.activeId,
    conversationContext: formatAdminAgentConversationContext(
      options.conversations.activeConversation?.messages ?? [],
    ),
    pageContext: options.pageContext.runtimeInstructions,
    conversationLoaded: options.conversations.activeConversation !== null,
    role: options.role,
    onAskUser: askUser,
    onRunProgress: runs.reportProgress,
  });
  agentRef.current = runtime.agent;
  return { runtime, runs, conversation };
}

function useTrackedAskUser(
  askUser: (question: string, options?: { signal: AbortSignal }) => Promise<string>,
  markWaiting: (question: string) => Promise<void>,
  markRunning: () => Promise<void>,
) {
  return useCallback(
    async (question: string, options?: { signal: AbortSignal }) => {
      const answerPromise = askUser(question, options);
      await markWaiting(question);
      const answer = await answerPromise;
      await markRunning();
      return answer;
    },
    [askUser, markRunning, markWaiting],
  );
}

type AdminAgentWidgetViewProps = {
  config: AdminPageAgentConfig | null;
  conversations: ReturnType<typeof useAdminAgentConversations>;
  conversation: ReturnType<typeof useAdminAgentConversation>;
  loading: boolean;
  modelManagerOpen: boolean;
  onClose: () => void;
  onModelManagerClose: () => void;
  onModelManagerOpen: () => void;
  onReloadConfig: () => Promise<void>;
  open: boolean;
  pageContext: ReturnType<typeof resolveAdminAgentPageContext>;
  runtime: ReturnType<typeof useAdminAgentRuntime>;
  runs: ReturnType<typeof useAdminAgentRunRecovery>;
};

function AdminAgentWidgetView(props: AdminAgentWidgetViewProps) {
  return (
    <>
      <AdminAgentDrawer
        activity={props.runtime.activity}
        config={props.config}
        conversationError={props.conversations.error}
        conversationLoading={props.conversations.loading}
        conversations={props.conversations.summaries}
        executionSteps={props.runtime.executionSteps}
        loading={props.loading}
        messages={props.conversation.messages}
        activeConversationId={props.conversations.activeId}
        onAnswer={props.conversation.answerQuestion}
        onClose={props.onClose}
        onCreateConversation={() => void props.conversations.createConversation()}
        onDeleteConversation={props.conversations.removeConversation}
        onRenameConversation={props.conversations.renameConversation}
        onSelectConversation={(conversationId) =>
          void props.conversations.selectConversation(conversationId)
        }
        onSend={props.conversation.submit}
        onRetry={props.conversation.retry}
        onSetup={props.onModelManagerOpen}
        onStop={props.conversation.stop}
        open={props.open}
        pendingQuestion={props.conversation.pendingQuestion}
        pageContext={props.pageContext}
        status={props.runtime.status}
        tokens={props.runtime.tokens}
        latestRun={props.runs.latestRun}
        runHistory={props.runs.runHistory}
        runError={props.runs.error}
      />
      <AdminAgentCredentialManager
        onChanged={props.onReloadConfig}
        onClose={props.onModelManagerClose}
        open={props.modelManagerOpen}
      />
    </>
  );
}
