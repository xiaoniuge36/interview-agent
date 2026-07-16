import { describe, expect, it } from 'vitest';
import {
  filterStaticSearchItems,
  isGlobalSearchShortcut,
  moveSearchIndex,
  questionSearchItems,
} from './global-search-model';

describe('全局搜索模型', () => {
  it('同时匹配专题与功能页面的标题、描述和关键词', () => {
    const agentItems = filterStaticSearchItems('agent');
    const systemItems = filterStaticSearchItems('系统设计');

    expect(agentItems.map((item) => item.label)).toContain('我的 Agent');
    expect(systemItems[0]?.kind).toBe('topic');
  });

  it('空查询只返回有限的推荐入口', () => {
    const items = filterStaticSearchItems('');

    expect(items.length).toBeLessThanOrEqual(6);
    expect(items.some((item) => item.kind === 'topic')).toBe(true);
    expect(items.some((item) => item.kind === 'page')).toBe(true);
  });

  it('把题目转换为可导航的统一搜索结果', () => {
    const [item] = questionSearchItems([
      {
        id: 'question-1',
        title: '如何设计 Agent 工具调用的重试机制？',
        stem: '说明失败重试和幂等设计。',
        type: 'system_design',
        difficulty: 'hard',
        tags: ['Agent', '可靠性', '系统设计'],
      },
    ]);

    expect(item).toMatchObject({
      id: 'question:question-1',
      kind: 'question',
      label: '如何设计 Agent 工具调用的重试机制？',
      badge: '系统设计 · 挑战',
      tags: ['Agent', '可靠性'],
    });
    expect(item?.href).toBe(
      '/questions?query=%E5%A6%82%E4%BD%95%E8%AE%BE%E8%AE%A1%20Agent%20%E5%B7%A5%E5%85%B7%E8%B0%83%E7%94%A8%E7%9A%84%E9%87%8D%E8%AF%95%E6%9C%BA%E5%88%B6%EF%BC%9F',
    );
  });

  it('让键盘索引首尾循环并处理空列表', () => {
    expect(moveSearchIndex(0, 3, 'previous')).toBe(2);
    expect(moveSearchIndex(2, 3, 'next')).toBe(0);
    expect(moveSearchIndex(0, 0, 'next')).toBe(-1);
  });

  it('仅接受不含 Alt 的 Ctrl/Cmd + K 全局快捷键', () => {
    expect(isGlobalSearchShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: false })).toBe(
      true,
    );
    expect(isGlobalSearchShortcut({ key: 'K', ctrlKey: false, metaKey: true, altKey: false })).toBe(
      true,
    );
    expect(isGlobalSearchShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: true })).toBe(
      false,
    );
    expect(isGlobalSearchShortcut({ key: 'p', ctrlKey: true, metaKey: false, altKey: false })).toBe(
      false,
    );
  });
});
