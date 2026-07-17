import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import {
  enqueueNotification,
  notificationError,
  type NotificationItem,
} from './notification-model';

describe('global operation notifications', () => {
  it('keeps the newest four notifications and replaces duplicate feedback', () => {
    const current: NotificationItem[] = [
      notice('one', '第一条'),
      notice('two', '第二条'),
      notice('three', '第三条'),
      notice('old-save', '档案已保存'),
    ];

    const next = enqueueNotification(current, notice('new-save', '档案已保存'));

    expect(next.map((item) => item.id)).toEqual(['one', 'two', 'three', 'new-save']);
  });

  it('uses the backend message and request id for failed operations', () => {
    const error = new ApiError({
      message: '当前档案版本已经变化，请刷新后重试。',
      code: 'PROFILE_VERSION_CONFLICT',
      status: 409,
      requestId: 'request-123',
    });

    expect(notificationError(error, '档案保存失败。')).toEqual({
      message: '当前档案版本已经变化，请刷新后重试。',
      requestId: 'request-123',
    });
    expect(notificationError(null, '档案保存失败。')).toEqual({
      message: '档案保存失败。',
    });
  });
});

function notice(id: string, title: string): NotificationItem {
  return { id, tone: 'success', title };
}
