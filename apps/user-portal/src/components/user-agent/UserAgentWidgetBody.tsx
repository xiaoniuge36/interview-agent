'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AgentStatus, PageAgentCore } from '@page-agent/core';
import { UserAgentDrawer } from './UserAgentDrawer';
import {
  createUserAgentDrawerCloseAction,
  createUserAgentSettingsAction,
} from './conversation-execution';
import { formatUserAgentConversationContext } from './user-agent-runtime';
import { resolveUserAgentPageContext } from './user-agent-page-context';
import { useUserAgentConfig } from './useUserAgentConfig';
import { useUserAgentConversation } from './useUserAgentConversation';
import { useUserAgentConversations } from './useUserAgentConversations';
import { useUserAgentRuntime } from './useUserAgentRuntime';
import { useUserAgentRunRecovery } from './useUserAgentRunRecovery';

const EMPTY_MESSAGES: never[] = [];

export type UserAgentWidgetBodyProps = {
  open: boolean;
  onRequestClose: () => void;
  onStatusChange: (status: AgentStatus) => void;
};

/** 浮窗主体：仅在首次打开后挂载，负责完整的 config/会话/运行时 bootstrap。 */
export function UserAgentWidgetBody(props: UserAgentWidgetBodyProps) {
  const controller = useUserAgentWidgetController(props);
  useStatusReporting(controller.runtime.status, props.onStatusChange);
  return <UserAgentWidgetView {...controller} open={props.open} />;
}

function useStatusReporting(status: AgentStatus, onStatusChange: (status: AgentStatus) => void) {
  useEffect(() => {
    onStatusChange(status);
  }, [onStatusChange, status]);
}

function useUserAgentWidgetController(bodyProps: UserAgentWidgetBodyProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageContext = resolveUserAgentPageContext(pathname);
  const agentRef = useRef<PageAgentCore | null>(null);
  const config = useUserAgentConfig();
  const conversations = useUserAgentConversations();
  const { runRecovery, runLifecycle } = useUserAgentRunIntegration(conversations.activeId);
  const conversation = useUserAgentConversation(agentRef, config.config, {
    conversationId: conversations.activeId,
    initialMessages: conversations.activeConversation?.messages ?? EMPTY_MESSAGES,
    persistMessages: conversations.persistMessages,
    runLifecycle,
  });
  const runtime = useUserAgentRuntime({
    config: config.config,
    conversationId: conversations.activeId,
    conversationContext: formatUserAgentConversationContext(
      conversations.activeConversation?.messages ?? [],
    ),
    pageContext: pageContext.runtimeInstructions,
    onAskUser: conversation.askUser,
  });
  agentRef.current = runtime.agent;
  useRunTelemetry(runtime, runLifecycle);
  const { onRequestClose } = bodyProps;
  const close = useCallback(
    () => createUserAgentDrawerCloseAction(conversation.stop, onRequestClose)(),
    [conversation.stop, onRequestClose],
  );
  const openSettings = useUserAgentSettingsNavigation(pathname, router, onRequestClose);
  return {
    config,
    conversations,
    runRecovery,
    conversation,
    runtime,
    close,
    openSettings,
    pageContext,
  };
}

function useUserAgentSettingsNavigation(
  pathname: string,
  router: ReturnType<typeof useRouter>,
  close: () => void,
) {
  return useMemo(
    () => createUserAgentSettingsAction(pathname, close, () => router.push('/settings')),
    [close, pathname, router],
  );
}

function useUserAgentRunIntegration(conversationId: string | null) {
  const runRecovery = useUserAgentRunRecovery(conversationId);
  const runLifecycle = useMemo(
    () => ({
      startRun: runRecovery.startRun,
      completeRun: runRecovery.completeRun,
      cancelActiveRun: runRecovery.cancelActiveRun,
      reportProgress: runRecovery.reportProgress,
      markWaiting: runRecovery.markWaiting,
      markRunning: runRecovery.markRunning,
    }),
    [
      runRecovery.cancelActiveRun,
      runRecovery.completeRun,
      runRecovery.markRunning,
      runRecovery.markWaiting,
      runRecovery.reportProgress,
      runRecovery.startRun,
    ],
  );
  return { runRecovery, runLifecycle };
}

function useRunTelemetry(
  runtime: ReturnType<typeof useUserAgentRuntime>,
  runLifecycle: ReturnType<typeof useUserAgentRunIntegration>['runLifecycle'],
) {
  useEffect(() => {
    runLifecycle.reportProgress({
      ...(runtime.status === 'running' ? { status: 'running' } : {}),
      currentStep: runtime.activity,
      tokenCount: runtime.tokens,
    });
  }, [runLifecycle, runtime.activity, runtime.status, runtime.tokens]);
}

function UserAgentWidgetView(
  props: ReturnType<typeof useUserAgentWidgetController> & { open: boolean },
) {
  return (
    <UserAgentDrawer
      activeConversationId={props.conversations.activeId}
      activity={props.runtime.activity}
      config={props.config.config}
      conversationError={
        props.conversations.error ??
        props.runtime.error ??
        props.runRecovery.error ??
        props.config.error
      }
      conversationLoading={props.conversations.loading}
      agentReady={props.runtime.agent !== null}
      conversations={props.conversations.summaries}
      executionSteps={props.runtime.executionSteps}
      loading={props.config.loading}
      messages={props.conversation.messages}
      latestRun={props.runRecovery.latestRun}
      onAnswer={props.conversation.answerQuestion}
      onClose={props.close}
      onCreateConversation={() => void props.conversations.createConversation()}
      onDeleteConversation={props.conversations.removeConversation}
      onRenameConversation={props.conversations.renameConversation}
      onRetry={(prompt, retryOfRunId) => void props.conversation.submit(prompt, retryOfRunId)}
      onSelectConversation={(id) => void props.conversations.selectConversation(id)}
      onSend={(value) => void props.conversation.submit(value)}
      onSetup={props.openSettings}
      onStop={props.conversation.stop}
      open={props.open}
      pendingQuestion={props.conversation.pendingQuestion}
      pageContext={props.pageContext}
      runHistory={props.runRecovery.runHistory}
      status={props.runtime.status}
      tokens={props.runtime.tokens}
    />
  );
}
