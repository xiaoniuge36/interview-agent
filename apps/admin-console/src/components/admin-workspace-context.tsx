'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdminView } from './admin-navigation';
import {
  DEFAULT_ADMIN_WORKSPACE_PREFERENCES,
  normalizeWorkspacePreferences,
  recordRecentView,
  toggleFavoriteView,
  type AdminAppearance,
  type AdminDensity,
  type AdminWorkspacePreferences,
} from './admin-workspace-model';

const STORAGE_KEY = 'admin-console.workspace-preferences';

type AdminWorkspaceContextValue = {
  preferences: AdminWorkspacePreferences;
  isFavorite: (view: AdminView) => boolean;
  recordView: (view: AdminView) => void;
  setAppearance: (appearance: AdminAppearance) => void;
  setDensity: (density: AdminDensity) => void;
  toggleFavorite: (view: AdminView) => void;
};

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

export function AdminWorkspaceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_ADMIN_WORKSPACE_PREFERENCES);
  const [isHydrated, setHydrated] = useState(false);
  useEffect(() => {
    setPreferences(readWorkspacePreferences());
    setHydrated(true);
  }, []);
  usePersistedPreferences(preferences, isHydrated);
  const isFavorite = useCallback(
    (view: AdminView) => preferences.favorites.includes(view),
    [preferences.favorites],
  );
  const recordView = useCallback((view: AdminView) => {
    setPreferences((current) => {
      if (current.recentViews[0] === view) return current;
      return { ...current, recentViews: recordRecentView(current.recentViews, view) };
    });
  }, []);
  const setAppearance = useCallback((appearance: AdminAppearance) => {
    setPreferences((current) =>
      current.appearance === appearance ? current : { ...current, appearance },
    );
  }, []);
  const setDensity = useCallback((density: AdminDensity) => {
    setPreferences((current) => (current.density === density ? current : { ...current, density }));
  }, []);
  const toggleFavorite = useCallback((view: AdminView) => {
    setPreferences((current) => ({
      ...current,
      favorites: toggleFavoriteView(current.favorites, view),
    }));
  }, []);
  const value = useMemo(
    () => ({ preferences, isFavorite, recordView, setAppearance, setDensity, toggleFavorite }),
    [isFavorite, preferences, recordView, setAppearance, setDensity, toggleFavorite],
  );
  return <AdminWorkspaceContext.Provider value={value}>{children}</AdminWorkspaceContext.Provider>;
}

export function useAdminWorkspace() {
  const context = useContext(AdminWorkspaceContext);
  if (!context) throw new Error('useAdminWorkspace must be used within AdminWorkspaceProvider');
  return context;
}

function readWorkspacePreferences(): AdminWorkspacePreferences {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_WORKSPACE_PREFERENCES;
  try {
    return normalizeWorkspacePreferences(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'),
    );
  } catch {
    return DEFAULT_ADMIN_WORKSPACE_PREFERENCES;
  }
}

function usePersistedPreferences(preferences: AdminWorkspacePreferences, isHydrated: boolean) {
  useEffect(() => {
    if (!isHydrated) return;
    document.documentElement.dataset.adminAppearance = preferences.appearance;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [isHydrated, preferences]);
}
