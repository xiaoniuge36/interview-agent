import { describe, expect, it } from 'vitest';
import {
  MAX_RECENT_VIEWS,
  normalizeWorkspacePreferences,
  recordRecentView,
  toggleFavoriteView,
} from './admin-workspace-model';

describe('admin workspace preferences', () => {
  it('moves the selected view to the front and keeps the recent list bounded', () => {
    const recent = recordRecentView(
      ['overview', 'imports', 'questions', 'content', 'models'],
      'imports',
    );

    expect(recent).toEqual(['imports', 'overview', 'questions', 'content', 'models']);
    expect(recent).toHaveLength(MAX_RECENT_VIEWS);
  });

  it('adds and removes a favorite without changing the remaining order', () => {
    expect(toggleFavoriteView(['overview', 'imports'], 'content')).toEqual([
      'overview',
      'imports',
      'content',
    ]);
    expect(toggleFavoriteView(['overview', 'imports', 'content'], 'imports')).toEqual([
      'overview',
      'content',
    ]);
  });

  it('keeps valid persisted preferences and drops unsupported navigation ids', () => {
    expect(
      normalizeWorkspacePreferences({
        appearance: 'dark',
        density: 'compact',
        favorites: ['content', 'unknown', 'accounts'],
        recentViews: ['runtime', 'bad-view', 'overview'],
      }),
    ).toEqual({
      appearance: 'dark',
      density: 'compact',
      favorites: ['content', 'accounts'],
      recentViews: ['runtime', 'overview'],
    });
  });
});
