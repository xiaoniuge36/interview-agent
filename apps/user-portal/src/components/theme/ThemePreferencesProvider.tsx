'use client';

import {
  createContext,
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
  THEME_STORAGE_KEY,
  parseThemePreferences,
  serializeThemePreferences,
  type AccentColor,
  type ThemeMode,
  type ThemePreferences,
} from './theme-preferences';

type ThemePreferencesContextValue = {
  preferences: ThemePreferences;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setMotion: (motion: boolean) => void;
};

const ThemePreferencesContext = createContext<ThemePreferencesContextValue | null>(null);

export function ThemePreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_THEME_PREFERENCES);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const stored = readStoredPreferences();
      applyPreferences(stored);
      setPreferences(stored);
      return;
    }
    applyPreferences(preferences);
    persistPreferences(preferences);
  }, [preferences]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPreferences((current) => ({ ...current, theme }));
  }, []);
  const setAccent = useCallback((accent: AccentColor) => {
    setPreferences((current) => ({ ...current, accent }));
  }, []);
  const setMotion = useCallback((motion: boolean) => {
    setPreferences((current) => ({ ...current, motion }));
  }, []);
  const value = useMemo(
    () => ({ preferences, setTheme, setAccent, setMotion }),
    [preferences, setAccent, setMotion, setTheme],
  );

  return (
    <ThemePreferencesContext.Provider value={value}>
      {children}
    </ThemePreferencesContext.Provider>
  );
}

export function useThemePreferences() {
  const value = useContext(ThemePreferencesContext);
  if (!value) throw new Error('useThemePreferences 必须在 ThemePreferencesProvider 内使用');
  return value;
}

function readStoredPreferences() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value ? parseThemePreferences(JSON.parse(value)) : DEFAULT_THEME_PREFERENCES;
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
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
  root.dataset.accent = preferences.accent;
  root.dataset.motion = preferences.motion ? 'on' : 'off';
}
