import type {
  PageAgentConversation,
  PageAgentConversationSummary,
  PageAgentMessage,
  PageAgentMessageRole,
} from '@interview-agent/contracts';
import { createPageAgentConversationRequests } from '@interview-agent/page-agent-client';
import { apiRequest } from './api';

const conversationRequests = createPageAgentConversationRequests('/user/page-agent');

export type UserAgentMessage = PageAgentMessage;
export type UserAgentConversationSummary = PageAgentConversationSummary;
export type UserAgentConversation = PageAgentConversation;
export type UserAgentMessageInput = { role: PageAgentMessageRole; content: string };

export function listUserAgentConversations() {
  return apiRequest(conversationRequests.list());
}

export function createUserAgentConversation(title?: string) {
  return apiRequest(conversationRequests.create(title));
}

export function getUserAgentConversation(conversationId: string) {
  return apiRequest(conversationRequests.get(conversationId));
}

export function renameUserAgentConversation(conversationId: string, title: string) {
  return apiRequest(conversationRequests.rename(conversationId, title));
}

export function deleteUserAgentConversation(conversationId: string) {
  return apiRequest(conversationRequests.remove(conversationId));
}

export function appendUserAgentMessages(conversationId: string, messages: UserAgentMessageInput[]) {
  return apiRequest(conversationRequests.appendMessages(conversationId, messages));
}

export const createUserAgentConversationsRequest = conversationRequests.list;
export const createUserAgentConversationRequest = conversationRequests.get;
export const createRenameUserAgentConversationRequest = conversationRequests.rename;
export const createAppendUserAgentMessagesRequest = conversationRequests.appendMessages;
export const createDeleteUserAgentConversationRequest = conversationRequests.remove;
