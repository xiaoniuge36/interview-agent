import type { UserAgentConversation } from '@/lib/user-agent-conversation-api';

export function reconcilePersistedConversation(
  current: UserAgentConversation | null,
  persisted: UserAgentConversation,
): UserAgentConversation | null {
  return current?.id === persisted.id ? persisted : current;
}
