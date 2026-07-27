import { describe, expect, it, vi } from 'vitest';
import { confirmConversationDeletion, runConversationMutation } from './conversation-management';

describe('对话 mutation 结果', () => {
  it('成功时返回 value', async () => {
    await expect(
      runConversationMutation({
        action: vi.fn().mockResolvedValue('updated'),
        fallbackMessage: '操作失败',
      }),
    ).resolves.toEqual({ success: true, value: 'updated' });
  });

  it('Error 失败时返回真实 message 而不 reject', async () => {
    await expect(
      runConversationMutation({
        action: vi.fn().mockRejectedValue(new Error('无法重命名对话。')),
        fallbackMessage: '操作失败',
      }),
    ).resolves.toEqual({ success: false, message: '无法重命名对话。' });
  });

  it('非 Error 失败时使用 fallback', async () => {
    await expect(
      runConversationMutation({
        action: vi.fn().mockRejectedValue('unavailable'),
        fallbackMessage: '无法删除对话。',
      }),
    ).resolves.toEqual({ success: false, message: '无法删除对话。' });
  });
});

describe('删除确认', () => {
  it('确认文案包含对话标题并返回用户选择', () => {
    const confirm = vi.fn().mockReturnValue(false);

    expect(confirmConversationDeletion('系统设计复盘', confirm)).toBe(false);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('系统设计复盘'));
  });
});
