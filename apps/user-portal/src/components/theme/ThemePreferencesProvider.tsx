'use client';

import { useAuth } from '@interview-agent/auth-client';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_THEME_PREFERENCES,
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  parseStoredThemePreferences,
  serializeThemePreferences,
  type ThemeMode,
  type ThemePreferences,
} from './theme-preferences';
import {
  createLatestThemePreferenceQueue,
  synchronizeInitialPreferences,
} from './theme-preferences-sync';
import { getUserPreferences, saveUserPreferences } from '@/lib/user-preferences-api';

type ThemePreferencesContextValue = {
  preferences: ThemePreferences;
  setTheme: (theme: ThemeMode) => void;
  setMotion: (motion: boolean) => void;
};

const ThemePreferencesContext = createContext<ThemePreferencesContextValue | null>(null);

export function ThemePreferencesProvider({ children }: { children: ReactNode }) {
  const controls = useThemePreferenceControls();
  return (
    <ThemePreferencesContext.Provider value={controls}>{children}</ThemePreferencesContext.Provider>
  );
}

function useThemePreferenceControls(): ThemePreferencesContextValue {
  const auth = useAuth();
  const { preferences, preferencesRef, replacePreferences } = useLocalThemePreferenceState();
  const identityKey = auth.status === 'authenticated' ? (auth.identity?.subject ?? null) : null;
  const enqueueRemote = useThemePreferenceCloudSync(
    identityKey,
    preferencesRef,
    replacePreferences,
  );
  const updatePreferences = useCallback(
    (patch: Partial<ThemePreferences>) => {
      const next = { ...preferencesRef.current, ...patch };
      replacePreferences(next);
      enqueueRemote(next);
    },
    [enqueueRemote, preferencesRef, replacePreferences],
  );
  const setTheme = useCallback(
    (theme: ThemeMode) => updatePreferences({ theme }),
    [updatePreferences],
  );
  const setMotion = useCallback(
    (motion: boolean) => updatePreferences({ motion }),
    [updatePreferences],
  );
  return useMemo(() => ({ preferences, setTheme, setMotion }), [preferences, setMotion, setTheme]);
}

function useLocalThemePreferenceState() {
  const [preferences, setPreferences] = useState(DEFAULT_THEME_PREFERENCES);
  const initialized = useRef(false);
  const preferencesRef = useRef(DEFAULT_THEME_PREFERENCES);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const stored = readStoredPreferences();
      preferencesRef.current = stored;
      applyPreferences(stored);
      // 本地回填对用户是后台行为，走 transition 以免打断进行中的路由导航。
      startTransition(() => setPreferences(stored));
      return;
    }
    preferencesRef.current = preferences;
    applyPreferences(preferences);
    persistPreferences(preferences);
  }, [preferences]);

  const replacePreferences = useCallback((next: ThemePreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
  }, []);
  return useMemo(
    () => ({ preferences, preferencesRef, replacePreferences }),
    [preferences, replacePreferences],
  );
}

function useThemePreferenceCloudSync(
  identityKey: string | null,
  preferencesRef: { current: ThemePreferences },
  replacePreferences: (next: ThemePreferences) => void,
) {
  const syncGenerationRef = useRef(0);
  const writeReadyRef = useRef(false);
  const saveQueueRef = useRef<ReturnType<typeof createLatestThemePreferenceQueue> | null>(null);
  if (!saveQueueRef.current) {
    saveQueueRef.current = createLatestThemePreferenceQueue(saveUserPreferences);
  }

  useEffect(() => {
    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    writeReadyRef.current = false;
    saveQueueRef.current?.reset();
    if (!identityKey) return;

    void synchronizeInitialPreferences(
      preferencesRef.current,
      getUserPreferences,
      saveUserPreferences,
    ).then((result) => {
      if (syncGenerationRef.current !== generation) return;
      // 云端回填对用户是后台行为，走 transition 以免打断进行中的路由导航。
      startTransition(() => replacePreferences(result.preferences));
      writeReadyRef.current = true;
    });

    return () => {
      if (syncGenerationRef.current !== generation) return;
      syncGenerationRef.current += 1;
      writeReadyRef.current = false;
      saveQueueRef.current?.reset();
    };
  }, [identityKey, preferencesRef, replacePreferences]);

  return useCallback((preferences: ThemePreferences) => {
    if (writeReadyRef.current) saveQueueRef.current?.enqueue(preferences);
  }, []);
}

export function useThemePreferences() {
  const value = useContext(ThemePreferencesContext);
  if (!value) throw new Error('useThemePreferences 必须在 ThemePreferencesProvider 内使用');
  return value;
}

function readStoredPreferences() {
  try {
    const v2 = readJson(window.localStorage.getItem(THEME_STORAGE_KEY));
    const v1 = readJson(window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY));
    return parseStoredThemePreferences(v2, v1);
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
}

function readJson(value: string | null): unknown {
  return value ? JSON.parse(value) : null;
}

function persistPreferences(preferences: ThemePreferences) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, serializeThemePreferences(preferences));
  } catch {
    // 隐私模式下仍保留本次会话的主题状态。
  }
}

function applyPreferences(preferences: ThemePreferences) {
  const root = document.documentElement;
  root.dataset.theme = preferences.theme;
  root.dataset.motion = preferences.motion ? 'on' : 'off';
  delete root.dataset.accent;
}
