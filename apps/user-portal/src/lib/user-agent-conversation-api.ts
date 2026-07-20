import { z } from 'zod';
import { apiRequest } from './api';

const MessageRoleSchema = z.enum(['user', 'assistant', 'error']);
const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  tokenCount: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});
const SummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  messageCount: z.number().int().nonnegative(),
  lastMessagePreview: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const ConversationSchema = SummarySchema.extend({ messages: z.array(MessageSchema) });
const ConversationListSchema = z.array(SummarySchema);

export type UserAgentMessage = z.infer<typeof MessageSchema>;
export type UserAgentConversationSummary = z.infer<typeof SummarySchema>;
export type UserAgentConversation = z.infer<typeof ConversationSchema>;
export type UserAgentMessageInput = { role: z.infer<typeof MessageRoleSchema>; content: string };

const basePath = '/user/page-agent/conversations';

export function listUserAgentConversations() {
  return apiRequest({ path: basePath, schema: ConversationListSchema });
}

export function createUserAgentConversation(title?: string) {
  return apiRequest({
    path: basePath,
    schema: SummarySchema,
    init: { method: 'POST', body: JSON.stringify(title ? { title } : {}) },
  });
}

export function getUserAgentConversation(conversationId: string) {
  return apiRequest({ path: conversationPath(conversationId), schema: ConversationSchema });
}

export function renameUserAgentConversation(conversationId: string, title: string) {
  return apiRequest({
    path: conversationPath(conversationId),
    schema: SummarySchema,
    init: { method: 'PATCH', body: JSON.stringify({ title }) },
  });
}

export function deleteUserAgentConversation(conversationId: string) {
  return apiRequest({
    path: conversationPath(conversationId),
    schema: z.null(),
    init: { method: 'DELETE' },
  });
}

export function appendUserAgentMessages(conversationId: string, messages: UserAgentMessageInput[]) {
  return apiRequest({
    path: `${conversationPath(conversationId)}/messages`,
    schema: ConversationSchema,
    init: { method: 'POST', body: JSON.stringify({ messages }) },
  });
}

export function createUserAgentConversationsRequest() {
  return { path: basePath, schema: ConversationListSchema };
}

export function createUserAgentConversationRequest(conversationId: string) {
  return { path: conversationPath(conversationId), schema: ConversationSchema };
}

export function createRenameUserAgentConversationRequest(conversationId: string, title: string) {
  return {
    path: conversationPath(conversationId),
    schema: SummarySchema,
    init: { method: 'PATCH', body: JSON.stringify({ title }) },
  };
}

export function createAppendUserAgentMessagesRequest(
  conversationId: string,
  messages: UserAgentMessageInput[],
) {
  return {
    path: `${conversationPath(conversationId)}/messages`,
    schema: ConversationSchema,
    init: { method: 'POST', body: JSON.stringify({ messages }) },
  };
}

export function createDeleteUserAgentConversationRequest(conversationId: string) {
  return {
    path: conversationPath(conversationId),
    schema: z.null(),
    init: { method: 'DELETE' },
  };
}

function conversationPath(conversationId: string) {
  return `${basePath}/${encodeURIComponent(conversationId)}`;
}
