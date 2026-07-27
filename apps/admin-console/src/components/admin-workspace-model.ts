import { isAdminView, type AdminView } from './admin-navigation';

export const MAX_RECENT_VIEWS = 5;

export type AdminAppearance = 'light' | 'dark';
export type AdminDensity = 'comfortable' | 'compact';

export type AdminWorkspacePreferences = {
  appearance: AdminAppearance;
  density: AdminDensity;
  favorites: AdminView[];
  recentViews: AdminView[];
};

export const DEFAULT_ADMIN_WORKSPACE_PREFERENCES: AdminWorkspacePreferences = {
  appearance: 'light',
  density: 'comfortable',
  favorites: [],
  recentViews: [],
};

export function recordRecentView(recentViews: readonly AdminView[], view: AdminView): AdminView[] {
  return [view, ...recentViews.filter((item) => item !== view)].slice(0, MAX_RECENT_VIEWS);
}

export function toggleFavoriteView(favorites: readonly AdminView[], view: AdminView): AdminView[] {
  return favorites.includes(view)
    ? favorites.filter((item) => item !== view)
    : [...favorites, view];
}

export function normalizeWorkspacePreferences(value: unknown): AdminWorkspacePreferences {
  if (!isRecord(value)) return DEFAULT_ADMIN_WORKSPACE_PREFERENCES;
  return {
    appearance: value.appearance === 'dark' ? 'dark' : 'light',
    density: value.density === 'compact' ? 'compact' : 'comfortable',
    favorites: toViews(value.favorites),
    recentViews: toViews(value.recentViews).slice(0, MAX_RECENT_VIEWS),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toViews(value: unknown): AdminView[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AdminView => typeof item === 'string' && isAdminView(item));
}
