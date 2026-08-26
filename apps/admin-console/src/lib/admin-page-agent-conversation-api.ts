import {
  PageAgentConversationListSchema,
  PageAgentConversationSchema,
  PageAgentConversationSummarySchema,
  PageAgentMessageSchema,
  type PageAgentConversation,
  type PageAgentConversationSummary,
  type PageAgentMessage,
} from '@interview-agent/contracts';
import {
  createPageAgentConversationRequests,
  type PageAgentMessageInput,
} from '@interview-agent/page-agent-client';
import { adminRequest } from './api';

const conversationRequests = createPageAgentConversationRequests('/admin/page-agent');

export const AdminAgentMessageSchema = PageAgentMessageSchema;
export const AdminAgentConversationSummarySchema = PageAgentConversationSummarySchema;
export const AdminAgentConversationSchema = PageAgentConversationSchema;
export const AdminAgentConversationListSchema = PageAgentConversationListSchema;

export type AdminAgentMessage = PageAgentMessage;
export type AdminAgentConversationSummary = PageAgentConversationSummary;
export type AdminAgentConversation = PageAgentConversation;
export type AdminAgentMessageInput = PageAgentMessageInput;

export const createAdminAgentConversationsRequest = conversationRequests.list;
export const createAdminAgentConversationRequest = conversationRequests.get;
export const createCreateAdminAgentConversationRequest = conversationRequests.create;
export const createRenameAdminAgentConversationRequest = conversationRequests.rename;
export const createDeleteAdminAgentConversationRequest = conversationRequests.remove;
export const createAppendAdminAgentMessagesRequest = conversationRequests.appendMessages;

export function listAdminAgentConversations(signal?: AbortSignal) {
  return adminRequest({
    ...conversationRequests.list(),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function getAdminAgentConversation(conversationId: string, signal?: AbortSignal) {
  return adminRequest({
    ...conversationRequests.get(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createAdminAgentConversation(title?: string) {
  return adminRequest(conversationRequests.create(title));
}

export function renameAdminAgentConversation(conversationId: string, title: string) {
  return adminRequest(conversationRequests.rename(conversationId, title));
}

export function deleteAdminAgentConversation(conversationId: string) {
  return adminRequest(conversationRequests.remove(conversationId));
}

export function appendAdminAgentMessages(
  conversationId: string,
  messages: AdminAgentMessageInput[],
) {
  return adminRequest(conversationRequests.appendMessages(conversationId, messages));
}
