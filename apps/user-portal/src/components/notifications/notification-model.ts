import { ApiError } from '../../lib/api';

const MAX_VISIBLE_NOTIFICATIONS = 4;

export type NotificationTone = 'success' | 'error' | 'info';

export type NotificationItem = {
  id: string;
  tone: NotificationTone;
  title: string;
  message?: string;
  requestId?: string;
  durationMs?: number;
};

export function enqueueNotification(
  current: NotificationItem[],
  notification: NotificationItem,
): NotificationItem[] {
  const next = current.filter((item) => notificationKey(item) !== notificationKey(notification));
  return [...next, notification].slice(-MAX_VISIBLE_NOTIFICATIONS);
}

export function notificationError(
  error: unknown,
  fallback: string,
): { message: string; requestId?: string } {
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : fallback;
  if (error instanceof ApiError && error.requestId) {
    return { message, requestId: error.requestId };
  }
  return { message };
}

function notificationKey(notification: NotificationItem): string {
  return [notification.tone, notification.title, notification.message, notification.requestId].join(
    '|',
  );
}
