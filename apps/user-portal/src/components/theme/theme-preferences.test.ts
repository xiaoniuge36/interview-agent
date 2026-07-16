import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_PREFERENCES,
  parseThemePreferences,
  serializeThemePreferences,
} from './theme-preferences';

describe('用户主题偏好', () => {
  it('保留受支持的主题、主题色和动效设置', () => {
    expect(parseThemePreferences({ theme: 'night', accent: 'teal', motion: false })).toEqual({
      theme: 'night',
      accent: 'teal',
      motion: false,
    });
  });

  it('无效或损坏的偏好回退到默认值', () => {
    expect(parseThemePreferences({ theme: 'unknown', accent: 'pink' })).toEqual(
      DEFAULT_THEME_PREFERENCES,
    );
    expect(parseThemePreferences('not-an-object')).toEqual(DEFAULT_THEME_PREFERENCES);
  });

  it('序列化结果可再次解析', () => {
    const preferences = { theme: 'ocean', accent: 'amber', motion: true } as const;
    expect(parseThemePreferences(JSON.parse(serializeThemePreferences(preferences)))).toEqual(
      preferences,
    );
  });
});
