import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ThemePreferencesSchema,
  UpsertUserPreferenceInputSchema,
  UserPreferencePayloadSchema,
} from './user-preference';

test('用户偏好接受六套主题和动效开关', () => {
  assert.deepEqual(ThemePreferencesSchema.parse({ theme: 'constructivist', motion: false }), {
    theme: 'constructivist',
    motion: false,
  });
});

test('用户偏好拒绝未知主题和客户端身份字段', () => {
  assert.equal(ThemePreferencesSchema.safeParse({ theme: 'unknown', motion: true }).success, false);
  assert.equal(
    UpsertUserPreferenceInputSchema.safeParse({
      theme: 'daylight',
      motion: true,
      userId: 'other-user',
    }).success,
    false,
  );
});

test('用户偏好接口允许服务端尚无记录', () => {
  assert.deepEqual(UserPreferencePayloadSchema.parse({ preferences: null }), {
    preferences: null,
  });
});
