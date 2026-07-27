import { describe, expect, it, vi } from 'vitest';
import { credentialActionOutcome, runCredentialAction } from './model-credential-action';

describe('模型连接主操作边界', () => {
  it('主操作失败时拒绝且不刷新列表', async () => {
    const failure = new Error('test failed');
    const refresh = vi.fn();

    await expect(
      runCredentialAction({ action: vi.fn().mockRejectedValue(failure), refresh }),
    ).rejects.toBe(failure);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('主操作与刷新都成功时返回完整同步', async () => {
    const result = await runCredentialAction({
      action: vi.fn().mockResolvedValue('credential-view'),
      refresh: vi.fn().mockResolvedValue(true),
    });

    expect(result).toEqual({ result: 'credential-view', synchronizationComplete: true });
  });

  it('refresh 返回 false 时仍保留主结果', async () => {
    const result = await runCredentialAction({
      action: vi.fn().mockResolvedValue('removed'),
      refresh: vi.fn().mockResolvedValue(false),
    });

    expect(result).toEqual({ result: 'removed', synchronizationComplete: false });
  });

  it('refresh 意外 reject 时仍保留主结果', async () => {
    const result = await runCredentialAction({
      action: vi.fn().mockResolvedValue('verified'),
      refresh: vi.fn().mockRejectedValue(new Error('refresh failed')),
    });

    expect(result).toEqual({ result: 'verified', synchronizationComplete: false });
  });
});

describe('模型连接部分同步反馈', () => {
  it('测试成功但列表待同步时说明真实状态', () => {
    expect(credentialActionOutcome('test', false)).toEqual({
      tone: 'info',
      message: '连接测试已成功，列表状态将在下次刷新时继续同步。',
      notificationDetail: '模型已通过真实调用验证；列表状态稍后继续同步。',
    });
  });

  it('删除成功但列表待同步时不误报删除失败', () => {
    expect(credentialActionOutcome('remove', false)).toEqual({
      tone: 'info',
      message: '模型连接已删除，列表状态将在下次刷新时继续同步。',
      notificationDetail: '服务端已删除该连接；列表状态稍后继续同步。',
    });
  });

  it('完整同步使用成功反馈', () => {
    expect(credentialActionOutcome('test', true).tone).toBe('success');
    expect(credentialActionOutcome('remove', true).tone).toBe('success');
  });
});
