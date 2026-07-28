import { describe, expect, it } from 'vitest';
import type { TrainingContinuation } from './training-continuation';

type HomeWelcome = {
  title: string;
  detail: string;
};

type HomeWelcomeModule = {
  createHomeWelcome?: (
    displayName: string | null | undefined,
    continuation: TrainingContinuation | null,
  ) => HomeWelcome;
};

const welcomeModule = await import('./home-welcome-model').catch(() => ({}) as HomeWelcomeModule);
const createHomeWelcome = welcomeModule.createHomeWelcome ?? (() => ({ title: '', detail: '' }));

const continuation: TrainingContinuation = {
  kind: 'practice',
  id: 'practice-1',
  title: '系统设计强化',
  updatedAt: '2026-07-27T08:00:00.000Z',
  href: '/practice?session=practice-1',
  kicker: '继续上次练习',
  detail: '进度已保留。',
  actionLabel: '继续练习',
  progressPercent: 40,
  statusLabel: null,
};

describe('createHomeWelcome', () => {
  it('在有续练时欢迎用户回来', () => {
    expect(createHomeWelcome('林夏', continuation)).toEqual({
      title: '欢迎回来，林夏',
      detail: '上次的训练还在这里等你',
    });
  });

  it('在没有续练时鼓励用户从一小步开始', () => {
    expect(createHomeWelcome('林夏', null)).toEqual({
      title: '你好，林夏',
      detail: '今天，先完成一小步就很好',
    });
  });

  it('在昵称缺失时使用自然的通用问候', () => {
    expect(createHomeWelcome(undefined, null).title).toBe('你好');
  });
});
