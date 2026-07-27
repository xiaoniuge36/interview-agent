import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TrainingContinuation } from './training-continuation';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { TrainingContinuationCard } = await import('./TrainingContinuationCard');

describe('TrainingContinuationCard', () => {
  it('renders practice progress and exact session link', () => {
    const markup = render({
      ...baseContinuation,
      kind: 'practice',
      href: '/practice?session=practice-1',
      actionLabel: '继续练习',
      progressPercent: 40,
      statusLabel: null,
    });

    expect(markup).toContain('练习进度 40%');
    expect(markup).toContain('width:40%');
    expect(markup).toContain('href="/practice?session=practice-1"');
  });

  it('renders interview live status and exact session link', () => {
    const markup = render({
      ...baseContinuation,
      kind: 'interview',
      href: '/interview?session=interview-1',
      actionLabel: '继续模拟',
      progressPercent: null,
      statusLabel: '等待你的回答',
    });

    expect(markup).toContain('面试现场状态：等待你的回答');
    expect(markup).toContain('recent-training-status');
    expect(markup).toContain('href="/interview?session=interview-1"');
  });
});

const baseContinuation: TrainingContinuation = {
  kind: 'practice',
  id: 'practice-1',
  title: '系统设计强化',
  updatedAt: '2026-07-23T12:00:00.000Z',
  href: '/practice?session=practice-1',
  kicker: '继续上次练习',
  detail: '进度已保留。',
  actionLabel: '继续练习',
  progressPercent: 40,
  statusLabel: null,
};

function render(continuation: TrainingContinuation) {
  return renderToStaticMarkup(createElement(TrainingContinuationCard, { continuation }));
}
