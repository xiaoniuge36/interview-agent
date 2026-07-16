export const THEME_STORAGE_KEY = 'offerpilot:theme-preferences:v1';

export type ThemeMode = 'dawn' | 'ocean' | 'night';
export type AccentColor = 'coral' | 'blue' | 'teal' | 'amber';

export type ThemePreferences = {
  theme: ThemeMode;
  accent: AccentColor;
  motion: boolean;
};

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  theme: 'dawn',
  accent: 'coral',
  motion: true,
};

const THEMES: ThemeMode[] = ['dawn', 'ocean', 'night'];
const ACCENTS: AccentColor[] = ['coral', 'blue', 'teal', 'amber'];

export function parseThemePreferences(value: unknown): ThemePreferences {
  if (!isRecord(value)) return DEFAULT_THEME_PREFERENCES;
  if (!THEMES.includes(value.theme as ThemeMode)) return DEFAULT_THEME_PREFERENCES;
  if (!ACCENTS.includes(value.accent as AccentColor)) return DEFAULT_THEME_PREFERENCES;
  return {
    theme: value.theme as ThemeMode,
    accent: value.accent as AccentColor,
    motion: typeof value.motion === 'boolean' ? value.motion : true,
  };
}

export function serializeThemePreferences(value: ThemePreferences) {
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
