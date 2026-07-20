import { z } from 'zod';
import { adminRequest } from './api';

export const AdminAgentMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'error']),
  content: z.string(),
  tokenCount: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});

export const AdminAgentConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  messageCount: z.number().int().nonnegative(),
  lastMessagePreview: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AdminAgentConversationSchema = AdminAgentConversationSummarySchema.extend({
  messages: z.array(AdminAgentMessageSchema),
});
export const AdminAgentConversationListSchema = z.array(AdminAgentConversationSummarySchema);

export type AdminAgentMessage = z.infer<typeof AdminAgentMessageSchema>;
export type AdminAgentConversationSummary = z.infer<typeof AdminAgentConversationSummarySchema>;
export type AdminAgentConversation = z.infer<typeof AdminAgentConversationSchema>;
export type AdminAgentMessageInput = {
  role: 'user' | 'assistant' | 'error';
  content: string;
  tokenCount?: number;
};

const conversationPath = (conversationId: string) =>
  `/admin/page-agent/conversations/${encodeURIComponent(conversationId)}`;

export function createAdminAgentConversationsRequest() {
  return { path: '/admin/page-agent/conversations', schema: AdminAgentConversationListSchema };
}

export function createAdminAgentConversationRequest(conversationId: string) {
  return { path: conversationPath(conversationId), schema: AdminAgentConversationSchema };
}

export function createCreateAdminAgentConversationRequest(title?: string) {
  return {
    path: '/admin/page-agent/conversations',
    schema: AdminAgentConversationSummarySchema,
    init: { method: 'POST', body: JSON.stringify(title ? { title } : {}) },
  };
}

export function createRenameAdminAgentConversationRequest(conversationId: string, title: string) {
  return {
    path: conversationPath(conversationId),
    schema: AdminAgentConversationSummarySchema,
    init: { method: 'PATCH', body: JSON.stringify({ title }) },
  };
}

export function createDeleteAdminAgentConversationRequest(conversationId: string) {
  return { path: conversationPath(conversationId), schema: z.null(), init: { method: 'DELETE' } };
}

export function createAppendAdminAgentMessagesRequest(
  conversationId: string,
  messages: AdminAgentMessageInput[],
) {
  return {
    path: `${conversationPath(conversationId)}/messages`,
    schema: AdminAgentConversationSchema,
    init: { method: 'POST', body: JSON.stringify({ messages }) },
  };
}

export function listAdminAgentConversations(signal?: AbortSignal) {
  return adminRequest({
    ...createAdminAgentConversationsRequest(),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function getAdminAgentConversation(conversationId: string, signal?: AbortSignal) {
  return adminRequest({
    ...createAdminAgentConversationRequest(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createAdminAgentConversation(title?: string) {
  return adminRequest(createCreateAdminAgentConversationRequest(title));
}

export function renameAdminAgentConversation(conversationId: string, title: string) {
  return adminRequest(createRenameAdminAgentConversationRequest(conversationId, title));
}

export function deleteAdminAgentConversation(conversationId: string) {
  return adminRequest(createDeleteAdminAgentConversationRequest(conversationId));
}

export function appendAdminAgentMessages(
  conversationId: string,
  messages: AdminAgentMessageInput[],
) {
  return adminRequest(createAppendAdminAgentMessagesRequest(conversationId, messages));
}
