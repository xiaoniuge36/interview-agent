import type { AdminAgentConversationSummary } from '@/lib/admin-page-agent-conversation-api';

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const HOUR_MS = MINUTES_PER_HOUR * MINUTE_MS;
const DAY_MS = HOURS_PER_DAY * HOUR_MS;

export function filterAdminAgentConversations(
  conversations: AdminAgentConversationSummary[],
  keyword: string,
) {
  const normalized = keyword.trim().toLocaleLowerCase();
  if (!normalized) return conversations;
  return conversations.filter((conversation) =>
    `${conversation.title} ${conversation.lastMessagePreview ?? ''}`
      .toLocaleLowerCase()
      .includes(normalized),
  );
}

export function formatConversationTime(value: string, now = new Date()) {
  const timestamp = new Date(value).getTime();
  const elapsed = Math.max(0, now.getTime() - timestamp);
  if (elapsed < MINUTE_MS) return '刚刚';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} 分钟前`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} 小时前`;
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(
    new Date(value),
  );
}
