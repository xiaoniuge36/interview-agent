export function isCurrentConversationEffect(
  currentConversationId: string | null,
  sourceConversationId: string | null,
): boolean {
  return sourceConversationId !== null && currentConversationId === sourceConversationId;
}
