'use client';

import { useCallback, useRef, useState } from 'react';
import type { PageAgentCore } from '@page-agent/core';
import { UserAgentDrawer } from './UserAgentDrawer';
import { UserAgentFloatButton } from './UserAgentFloatButton';
import { formatUserAgentConversationContext } from './user-agent-runtime';
import { useUserAgentConfig } from './useUserAgentConfig';
import { useUserAgentConversation } from './useUserAgentConversation';
import { useUserAgentConversations } from './useUserAgentConversations';
import { useUserAgentDrag } from './useUserAgentDrag';
import { useUserAgentRuntime } from './useUserAgentRuntime';

const EMPTY_MESSAGES: never[] = [];

export function UserAgentWidget() {
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
    conversationContext: formatUserAgentConversationContext(conversations.activeConversation?.messages ?? []),
    onAskUser: conversation.askUser,
  });
  agentRef.current = runtime.agent;
  const drag = useUserAgentDrag(() => setOpen(true));
  const close = useCallback(() => setOpen(false), []);
  const openSettings = useCallback(() => {
    setOpen(false);
    window.location.href = '/settings';
  }, []);
  return (
    <>
      <UserAgentFloatButton {...drag} status={runtime.status} />
      <UserAgentDrawer
        activeConversationId={conversations.activeId}
        activity={runtime.activity}
        config={config.config}
        conversationError={conversations.error ?? config.error}
        conversationLoading={conversations.loading}
        conversations={conversations.summaries}
        loading={config.loading}
        messages={conversation.messages}
        onAnswer={conversation.answerQuestion}
        onClose={close}
        onCreateConversation={() => void conversations.createConversation()}
        onDeleteConversation={conversations.removeConversation}
        onRenameConversation={conversations.renameConversation}
        onSelectConversation={(id) => void conversations.selectConversation(id)}
        onSend={(value) => void conversation.submit(value)}
        onSetup={openSettings}
        onStop={conversation.stop}
        open={open}
        pendingQuestion={conversation.pendingQuestion}
        status={runtime.status}
        tokens={runtime.tokens}
      />
    </>
  );
}
