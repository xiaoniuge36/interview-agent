'use client';

import { useAuth } from '@interview-agent/auth-client';
import { useCallback, useRef, useState } from 'react';
import type { PageAgentCore } from '@page-agent/core';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';
import type { AdminView } from '@/components/admin-navigation';
import { AdminAgentCredentialManager } from './AdminAgentCredentialManager';
import { AdminAgentDrawer } from './AdminAgentDrawer';
import { AdminAgentFloatButton } from './AdminAgentFloatButton';
import { useAdminAgentConfig } from './useAdminAgentConfig';
import { useAdminAgentConversation } from './useAdminAgentConversation';
import { useAdminAgentConversations } from './useAdminAgentConversations';
import { useAdminAgentDrag } from './useAdminAgentDrag';
import { useAdminAgentRuntime } from './useAdminAgentRuntime';
import { formatAdminAgentConversationContext } from './admin-agent-runtime';
import { resolveAdminAgentPageContext } from './admin-agent-page-context';

const EMPTY_CONVERSATION_MESSAGES: never[] = [];

export function AdminAgentWidget({ activeView }: { activeView: AdminView }) {
  const role = useAuth().identity?.role;
  const pageContext = resolveAdminAgentPageContext(activeView, role);
  const enabled = role === 'admin' || role === 'platform_admin';
  const [open, setOpen] = useState(false);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const { config, loading, reloadConfig } = useAdminAgentConfig(enabled);
  const conversations = useAdminAgentConversations(enabled);
  const agentRef = useRef<PageAgentCore | null>(null);
  const conversation = useAdminAgentConversation(agentRef, config, {
    conversationId: conversations.activeId,
    initialMessages: conversations.activeConversation?.messages ?? EMPTY_CONVERSATION_MESSAGES,
    persistMessages: conversations.persistMessages,
  });
  const runtime = useAdminAgentRuntime({
    enabled,
    config,
    conversationId: conversations.activeId,
    conversationContext: formatAdminAgentConversationContext(
      conversations.activeConversation?.messages ?? [],
    ),
    pageContext: pageContext.runtimeInstructions,
    conversationLoaded: conversations.activeConversation !== null,
    role,
    onAskUser: conversation.askUser,
  });
  agentRef.current = runtime.agent;
  const drag = useAdminAgentDrag(() => setOpen(true));
  const openModelManager = useCallback(() => setModelManagerOpen(true), []);

  if (!enabled) return null;

  return (
    <AdminAgentWidgetView
      config={config}
      conversations={conversations}
      drag={drag}
      loading={loading}
      modelManagerOpen={modelManagerOpen}
      onClose={() => setOpen(false)}
      onModelManagerClose={() => setModelManagerOpen(false)}
      onModelManagerOpen={openModelManager}
      onReloadConfig={reloadConfig}
      open={open}
      pageContext={pageContext}
      runtime={runtime}
      conversation={conversation}
    />
  );
}

type AdminAgentWidgetViewProps = {
  config: AdminPageAgentConfig | null;
  conversations: ReturnType<typeof useAdminAgentConversations>;
  conversation: ReturnType<typeof useAdminAgentConversation>;
  drag: ReturnType<typeof useAdminAgentDrag>;
  loading: boolean;
  modelManagerOpen: boolean;
  onClose: () => void;
  onModelManagerClose: () => void;
  onModelManagerOpen: () => void;
  onReloadConfig: () => Promise<void>;
  open: boolean;
  pageContext: ReturnType<typeof resolveAdminAgentPageContext>;
  runtime: ReturnType<typeof useAdminAgentRuntime>;
};

function AdminAgentWidgetView(props: AdminAgentWidgetViewProps) {
  return (
    <>
      <AdminAgentFloatButton {...props.drag} status={props.runtime.status} />
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
        onSetup={props.onModelManagerOpen}
        onStop={props.conversation.stop}
        open={props.open}
        pendingQuestion={props.conversation.pendingQuestion}
        pageContext={props.pageContext}
        status={props.runtime.status}
        tokens={props.runtime.tokens}
      />
      <AdminAgentCredentialManager
        onChanged={props.onReloadConfig}
        onClose={props.onModelManagerClose}
        open={props.modelManagerOpen}
      />
    </>
  );
}
