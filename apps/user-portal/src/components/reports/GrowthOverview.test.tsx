import type { MasteryProfile } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GrowthOverviewView, type MasterySource } from './GrowthOverview';
import type { TrainingRecord } from './training-records-model';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function profile(tag: string, score: number): MasteryProfile {
  return {
    id: `mastery-${tag}`,
    tenantId: 'tenant-1',
    userId: 'user-1',
    tag,
    score,
    evidenceCount: 3,
    lastEvidenceSessionId: null,
    updatedAt: '2026-08-27T00:00:00.000Z',
  };
}

function record(id: string, score: number, updatedAt: string): TrainingRecord {
  return {
    id,
    kind: 'practice',
    title: '训练',
    updatedAt,
    status: 'report_ready',
    href: `/practice?session=${id}`,
    score,
    facts: [],
    signals: [],
    trend: null,
  };
}

function mastery(overrides: Partial<MasterySource>): MasterySource {
  return { profiles: [], status: 'ready', reload: () => undefined, ...overrides };
}

function render(records: TrainingRecord[], source: MasterySource) {
  return renderToStaticMarkup(createElement(GrowthOverviewView, { records, mastery: source }));
}

describe('GrowthOverviewView', () => {
  it('加载中渲染骨架而不是整块消失', () => {
    const markup = render([], mastery({ status: 'loading' }));

    expect(markup).toContain('aria-label="成长概览"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('growth-overview-skeleton');
    expect(markup).toContain('得分趋势');
  });

  it('掌握度读取失败时保留区块并提供重新读取', () => {
    const markup = render([], mastery({ status: 'error' }));

    expect(markup).toContain('掌握度暂时读取失败');
    expect(markup).toContain('重新读取');
    expect(markup).toContain('得分趋势');
    expect(markup).not.toContain('完成三个以上能力标签的训练后');
  });

  it('数据不足时渲染引导空态而不是卸载区块', () => {
    const markup = render([], mastery({ status: 'ready' }));

    expect(markup).toContain('完成三个以上能力标签的训练后');
    expect(markup).toContain('完成两次以上带评分的训练后');
  });

  it('训练充分时渲染雷达与统一格式的趋势时间', () => {
    const markup = render(
      [record('r1', 60, '2026-08-01T02:00:00.000Z'), record('r2', 82, '2026-08-10T02:00:00.000Z')],
      mastery({ profiles: [profile('RAG', 80), profile('系统设计', 66), profile('评测', 71)] }),
    );

    expect(markup).toContain('能力雷达图');
    expect(markup).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2} · 训练 · 82 分/);
  });
});
