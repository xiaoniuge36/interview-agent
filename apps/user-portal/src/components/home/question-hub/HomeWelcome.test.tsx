import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TrainingContinuation } from './training-continuation';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type HomeWelcomeProps = {
  displayName?: string | null;
  continuation: TrainingContinuation | null;
};

type HomeWelcomeModule = {
  HomeWelcome?: (props: HomeWelcomeProps) => React.ReactNode;
};

const welcomeModule = await import('./HomeWelcome').catch(() => ({}) as HomeWelcomeModule);
const HomeWelcome = welcomeModule.HomeWelcome ?? (() => null);

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

describe('HomeWelcome', () => {
  it('以真实续练状态欢迎用户回来并提供继续入口', () => {
    const markup = renderToStaticMarkup(
      createElement(HomeWelcome, { displayName: '林夏', continuation }),
    );

    expect(markup).toContain('欢迎回来，林夏');
    expect(markup).toContain('上次的训练还在这里等你');
    expect(markup).toContain('继续练习');
    expect(markup).toContain('陪练已就位');
  });

  it('在没有续练时使用低压力的开场', () => {
    const markup = renderToStaticMarkup(createElement(HomeWelcome, { continuation: null }));

    expect(markup).toContain('你好');
    expect(markup).toContain('今天，先完成一小步就很好');
    expect(markup).toContain('陪练已就位');
  });
});
