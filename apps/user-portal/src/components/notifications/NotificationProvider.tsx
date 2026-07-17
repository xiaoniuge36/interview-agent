'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  enqueueNotification,
  notificationError,
  type NotificationItem,
  type NotificationTone,
} from './notification-model';

export type NotificationApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, error: unknown, fallback?: string) => void;
  info: (title: string, message?: string) => void;
};

const NotificationContext = createContext<NotificationApi | null>(null);
const DEFAULT_NOTIFICATION_DURATION_MS = 4_200;
const ERROR_NOTIFICATION_DURATION_MS = 6_500;
let notificationSequence = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const publish = useCallback((draft: Omit<NotificationItem, 'id'>) => {
    const item = { ...draft, id: notificationId() };
    setItems((current) => enqueueNotification(current, item));
  }, []);
  const api = useMemo<NotificationApi>(
    () => ({
      success: (title, message) =>
        publish({ tone: 'success', title, ...(message ? { message } : {}) }),
      info: (title, message) => publish({ tone: 'info', title, ...(message ? { message } : {}) }),
      error: (title, error, fallback = '操作没有完成，请稍后重试。') => {
        const details = notificationError(error, fallback);
        publish({ tone: 'error', title, ...details, durationMs: ERROR_NOTIFICATION_DURATION_MS });
      },
    }),
    [publish],
  );
  return (
    <NotificationContext.Provider value={api}>
      {children}
      <NotificationViewport items={items} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationApi {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications 必须在 NotificationProvider 内使用。');
  return context;
}

function NotificationViewport({
  items,
  onDismiss,
}: {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <aside className="notification-viewport" aria-label="操作通知" aria-live="polite">
      {items.map((item) => (
        <NotificationCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </aside>
  );
}

function NotificationCard({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(
      () => onDismiss(item.id),
      item.durationMs ?? DEFAULT_NOTIFICATION_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [item.durationMs, item.id, onDismiss]);
  return (
    <article
      className={`operation-notification ${item.tone}`}
      role={item.tone === 'error' ? 'alert' : 'status'}
    >
      <span className="operation-notification-icon" aria-hidden="true">
        {notificationIcon(item.tone)}
      </span>
      <span className="operation-notification-copy">
        <strong>{item.title}</strong>
        {item.message ? <span>{item.message}</span> : null}
        {item.requestId ? <small>请求编号：{item.requestId}</small> : null}
      </span>
      <button type="button" aria-label="关闭通知" onClick={() => onDismiss(item.id)}>
        ×
      </button>
    </article>
  );
}

function notificationIcon(tone: NotificationTone): string {
  return { success: '✓', error: '!', info: 'i' }[tone];
}

function notificationId(): string {
  notificationSequence += 1;
  return `notice-${Date.now()}-${notificationSequence}`;
}
