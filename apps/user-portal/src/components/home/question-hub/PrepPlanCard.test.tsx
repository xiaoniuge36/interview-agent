import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PrepPlanData, PrepPlanState } from './use-prep-plan-data';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const planState = vi.hoisted(() => ({
  value: { status: 'loading' } as { status: string },
}));

vi.mock('./use-prep-plan-data', () => ({
  usePrepPlanData: () => ({
    state: planState.value,
    reload: vi.fn(),
    applyJobUpdate: vi.fn(),
  }),
}));

vi.mock('@/lib/workspace-api', () => ({
  updateJobIntentSchedule: vi.fn(),
}));

const { PrepPlanCard } = await import('./PrepPlanCard');

describe('PrepPlanCard', () => {
  it('加载中渲染骨架占位而不是消失', () => {
    planState.value = { status: 'loading' };

    const markup = renderToStaticMarkup(createElement(PrepPlanCard));

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('data-state="loading"');
    expect(markup).toContain('prep-plan-skeleton-bar');
    expect(markup).toContain('面试倒计时');
    expect(markup).toContain('今日任务');
    expect(markup).toContain('连续训练');
  });

  it('读取失败渲染错误文案与重新读取入口', () => {
    planState.value = { status: 'error' };

    const markup = renderToStaticMarkup(createElement(PrepPlanCard));

    expect(markup).toContain('备考计划暂时没有读取成功');
    expect(markup).toContain('重新读取');
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain('prep-plan-skeleton-bar');
  });

  it('数据就绪时渲染倒计时、任务与连续训练三个面板', () => {
    planState.value = {
      status: 'ready',
      data: readyData(),
    } satisfies PrepPlanState as unknown as { status: string };

    const markup = renderToStaticMarkup(createElement(PrepPlanCard));

    expect(markup).toContain('面试倒计时');
    expect(markup).toContain('今日任务');
    expect(markup).toContain('最近七天训练记录');
    expect(markup).not.toContain('重新读取');
    expect(markup).not.toContain('prep-plan-skeleton-bar');
  });
});

function readyData(): PrepPlanData {
  return {
    practices: [],
    interviews: [],
    jobs: [],
    jobsFailed: false,
    learningUpdatedAt: null,
    mastery: [],
  };
}
