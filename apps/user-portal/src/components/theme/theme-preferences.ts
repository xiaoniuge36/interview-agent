import {
  ThemeModeSchema,
  ThemePreferencesSchema,
  type ThemeMode,
  type ThemePreferences,
} from '@interview-agent/contracts';

export const THEME_STORAGE_KEY = 'offerpilot:theme-preferences:v2';
export const LEGACY_THEME_STORAGE_KEY = 'offerpilot:theme-preferences:v1';
export const THEMES = ThemeModeSchema.options;

export type { ThemeMode, ThemePreferences };

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  theme: 'daylight',
  motion: true,
};

export const LEGACY_THEME_MAP = {
  dawn: 'daylight',
  ocean: 'glass',
  night: 'aurora',
} as const satisfies Record<string, ThemeMode>;

export function parseThemePreferences(value: unknown): ThemePreferences {
  const parsed = ThemePreferencesSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_THEME_PREFERENCES;
}

export function parseStoredThemePreferences(v2: unknown, v1: unknown): ThemePreferences {
  const current = ThemePreferencesSchema.safeParse(v2);
  if (current.success) return current.data;
  if (!isRecord(v1)) return DEFAULT_THEME_PREFERENCES;

  const theme = LEGACY_THEME_MAP[v1.theme as keyof typeof LEGACY_THEME_MAP];
  if (!theme) return DEFAULT_THEME_PREFERENCES;
  return {
    theme,
    motion: typeof v1.motion === 'boolean' ? v1.motion : true,
  };
}

export function serializeThemePreferences(value: ThemePreferences) {
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
