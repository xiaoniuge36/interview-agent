import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_PREFERENCES,
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  parseStoredThemePreferences,
  parseThemePreferences,
  serializeThemePreferences,
} from './theme-preferences';

describe('用户主题偏好', () => {
  it('保留受支持的六主题和动效设置', () => {
    expect(parseThemePreferences({ theme: 'constructivist', motion: false })).toEqual({
      theme: 'constructivist',
      motion: false,
    });
  });

  it.each([
    ['dawn', 'daylight'],
    ['ocean', 'glass'],
    ['night', 'aurora'],
  ] as const)('把旧主题 %s 迁移为 %s', (legacyTheme, theme) => {
    expect(
      parseStoredThemePreferences(null, {
        theme: legacyTheme,
        accent: 'teal',
        motion: false,
      }),
    ).toEqual({ theme, motion: false });
  });

  it('优先使用有效的 v2 偏好', () => {
    expect(
      parseStoredThemePreferences(
        { theme: 'playground', motion: true },
        { theme: 'night', accent: 'blue', motion: false },
      ),
    ).toEqual({ theme: 'playground', motion: true });
  });

  it('无效或损坏的偏好回退到白昼主题', () => {
    expect(parseStoredThemePreferences({ theme: 'unknown' }, null)).toEqual(
      DEFAULT_THEME_PREFERENCES,
    );
    expect(parseThemePreferences('not-an-object')).toEqual(DEFAULT_THEME_PREFERENCES);
  });

  it('使用 v2 键并可序列化后再次解析', () => {
    expect(THEME_STORAGE_KEY).toBe('offerpilot:theme-preferences:v2');
    expect(LEGACY_THEME_STORAGE_KEY).toBe('offerpilot:theme-preferences:v1');
    const preferences = { theme: 'glass', motion: true } as const;
    expect(parseThemePreferences(JSON.parse(serializeThemePreferences(preferences)))).toEqual(
      preferences,
    );
  });
});
