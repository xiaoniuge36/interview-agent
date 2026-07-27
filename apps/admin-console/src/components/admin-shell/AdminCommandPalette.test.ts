import { describe, expect, it } from 'vitest';
import {
  buildCommandSections,
  findCommandItems,
  flattenCommandSections,
  moveCommandSelection,
} from './admin-command-model';

describe('command palette', () => {
  it('only returns items available to the active role and matches their helper text', () => {
    const items = findCommandItems('运行', 'admin');

    expect(items.map((item) => item.id)).toContain('runtime');
    expect(items.map((item) => item.id)).not.toContain('analytics');
    expect(items.map((item) => item.id)).not.toContain('accounts');
  });

  it('deduplicates favorites and recent views before the remaining modules', () => {
    const sections = buildCommandSections({
      query: '',
      role: 'platform_admin',
      favoriteViews: ['runtime'],
      recentViews: ['runtime', 'imports'],
    });

    expect(sections.map((section) => [section.key, section.items.map((item) => item.id)])).toEqual([
      ['favorites', ['runtime']],
      ['recent', ['imports']],
      ['all', ['overview', 'analytics', 'questions', 'content', 'models', 'audit', 'accounts']],
    ]);
    expect(flattenCommandSections(sections).map((item) => item.id)).toEqual([
      'runtime',
      'imports',
      'overview',
      'analytics',
      'questions',
      'content',
      'models',
      'audit',
      'accounts',
    ]);
  });

  it('uses a single permission-filtered search results section when querying', () => {
    const sections = buildCommandSections({
      query: '运行',
      role: 'admin',
      favoriteViews: ['accounts'],
      recentViews: ['analytics'],
    });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe('results');
    expect(sections[0]?.items.map((item) => item.id)).toEqual(['runtime']);
  });

  it('wraps keyboard selection and leaves empty lists unselected', () => {
    expect(moveCommandSelection(0, -1, 3)).toBe(2);
    expect(moveCommandSelection(2, 1, 3)).toBe(0);
    expect(moveCommandSelection(-1, 1, 3)).toBe(0);
    expect(moveCommandSelection(0, 1, 0)).toBe(-1);
  });
});
