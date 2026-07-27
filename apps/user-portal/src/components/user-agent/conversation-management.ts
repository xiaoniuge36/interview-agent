type ConversationMutationInput<T> = {
  action: () => Promise<T>;
  fallbackMessage: string;
};

export type ConversationMutationResult<T> =
  { success: true; value: T } | { success: false; message: string };

export async function runConversationMutation<T>(
  input: ConversationMutationInput<T>,
): Promise<ConversationMutationResult<T>> {
  try {
    return { success: true, value: await input.action() };
  } catch (reason) {
    return {
      success: false,
      message: reason instanceof Error ? reason.message : input.fallbackMessage,
    };
  }
}

export function confirmConversationDeletion(
  title: string,
  confirm: (message: string) => boolean,
): boolean {
  return confirm(`删除对话“${title}”后无法恢复，确定继续吗？`);
}
