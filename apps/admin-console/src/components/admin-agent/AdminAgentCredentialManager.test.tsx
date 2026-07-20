import { describe, expect, it } from 'vitest';
import { MODEL_CREDENTIAL_MANAGER_COPY } from './AdminAgentCredentialManager';

describe('AdminAgentCredentialManager', () => {
  it('keeps model connection management inside the existing Agent settings flow', () => {
    expect(MODEL_CREDENTIAL_MANAGER_COPY).toEqual({
      title: '模型连接管理',
      hint: '密钥仅显示掩码；修改或轮换后需要重新测试。',
      create: '新增模型连接',
    });
  });
});
