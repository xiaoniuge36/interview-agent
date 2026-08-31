import type { MasteryProfile } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JdMatchPanelView, type JdMasterySource } from './JdMatchPanel';

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

function render(jdContext: string, mastery: JdMasterySource) {
  return renderToStaticMarkup(createElement(JdMatchPanelView, { jdContext, mastery }));
}

describe('JdMatchPanelView', () => {
  it('加载中渲染骨架而不是整块消失', () => {
    const markup = render('要求：熟悉 RAG。', { status: 'loading' });

    expect(markup).toContain('JD 匹配标注');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('jd-match-skeleton');
  });

  it('掌握度读取失败时展示错误与重试', () => {
    const markup = render('要求：熟悉 RAG。', {
      status: 'error',
      reload: () => undefined,
    });

    expect(markup).toContain('掌握度读取失败');
    expect(markup).toContain('重试');
  });

  it('分数带「分」单位，待补强给出刷题与模拟面试双出口', () => {
    const markup = render('要求：熟悉 RAG 与系统设计。', {
      status: 'ready',
      profiles: [profile('RAG', 86), profile('系统设计', 45)],
    });

    expect(markup).toContain('86 分');
    expect(markup).toContain('45 分');
    expect(markup).toContain('href="/questions?tags=%E7%B3%BB%E7%BB%9F%E8%AE%BE%E8%AE%A1"');
    expect(markup).toContain('开始针对性模拟面试');
    expect(markup).toContain('href="/interview"');
  });

  it('没有待补强项时不显示模拟面试出口', () => {
    const markup = render('要求：熟悉 RAG。', {
      status: 'ready',
      profiles: [profile('RAG', 86)],
    });

    expect(markup).not.toContain('开始针对性模拟面试');
  });

  it('超出展示上限时提示还有多少项未列出', () => {
    const tags = Array.from({ length: 13 }, (_, index) => `技能${index}`);
    const markup = render(tags.join(' '), {
      status: 'ready',
      profiles: tags.map((tag) => profile(tag, 90)),
    });

    expect(markup).toContain('还有 1 项未列出');
  });
});
