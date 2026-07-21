'use client';

import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { PageAgentCore } from '@page-agent/core';
import { UserAgentDrawer } from './UserAgentDrawer';
import { UserAgentFloatButton } from './UserAgentFloatButton';
import { formatUserAgentConversationContext } from './user-agent-runtime';
import { resolveUserAgentPageContext } from './user-agent-page-context';
import { useUserAgentConfig } from './useUserAgentConfig';
import { useUserAgentConversation } from './useUserAgentConversation';
import { useUserAgentConversations } from './useUserAgentConversations';
import { useUserAgentDrag } from './useUserAgentDrag';
import { useUserAgentRuntime } from './useUserAgentRuntime';

const EMPTY_MESSAGES: never[] = [];

export function UserAgentWidget() {
  const controller = useUserAgentWidgetController();
  return <UserAgentWidgetView {...controller} />;
}

function useUserAgentWidgetController() {
  const pageContext = resolveUserAgentPageContext(usePathname());
  const [open, setOpen] = useState(false);
  const agentRef = useRef<PageAgentCore | null>(null);
  const config = useUserAgentConfig();
  const conversations = useUserAgentConversations();
  const conversation = useUserAgentConversation(agentRef, config.config, {
    conversationId: conversations.activeId,
    initialMessages: conversations.activeConversation?.messages ?? EMPTY_MESSAGES,
    persistMessages: conversations.persistMessages,
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
  const drag = useUserAgentDrag(() => setOpen(true));
  const close = useCallback(() => setOpen(false), []);
  const openSettings = useCallback(() => {
    setOpen(false);
    window.location.href = '/settings';
  }, []);
  return { open, config, conversations, conversation, runtime, drag, close, openSettings, pageContext };
}

function UserAgentWidgetView(props: ReturnType<typeof useUserAgentWidgetController>) {
  return (
    <>
      <UserAgentFloatButton {...props.drag} status={props.runtime.status} />
      <UserAgentDrawer
        activeConversationId={props.conversations.activeId}
        activity={props.runtime.activity}
        config={props.config.config}
        conversationError={props.conversations.error ?? props.config.error}
        conversationLoading={props.conversations.loading}
        agentReady={props.runtime.agent !== null}
        conversations={props.conversations.summaries}
        executionSteps={props.runtime.executionSteps}
        loading={props.config.loading}
        messages={props.conversation.messages}
        onAnswer={props.conversation.answerQuestion}
        onClose={props.close}
        onCreateConversation={() => void props.conversations.createConversation()}
        onDeleteConversation={props.conversations.removeConversation}
        onRenameConversation={props.conversations.renameConversation}
        onSelectConversation={(id) => void props.conversations.selectConversation(id)}
        onSend={(value) => void props.conversation.submit(value)}
        onSetup={props.openSettings}
        onStop={props.conversation.stop}
        open={props.open}
        pendingQuestion={props.conversation.pendingQuestion}
        pageContext={props.pageContext}
        status={props.runtime.status}
        tokens={props.runtime.tokens}
      />
    </>
  );
}
