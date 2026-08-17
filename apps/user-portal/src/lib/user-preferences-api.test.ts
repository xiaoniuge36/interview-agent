import { describe, expect, it } from 'vitest';
import {
  createGetUserPreferencesRequest,
  createSaveUserPreferencesRequest,
} from './user-preferences-api';

describe('用户主题偏好 API', () => {
  it('构造当前用户偏好的 GET 请求', () => {
    expect(createGetUserPreferencesRequest()).toMatchObject({
      path: '/user-preferences',
    });
  });

  it('只发送主题和动效，不发送用户身份字段', () => {
    const request = createSaveUserPreferencesRequest({ theme: 'glass', motion: false });

    expect(request).toMatchObject({
      path: '/user-preferences',
      init: {
        method: 'PUT',
        body: JSON.stringify({ theme: 'glass', motion: false }),
      },
    });
  });
});
