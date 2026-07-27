import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { AdminAppearance } from './admin-workspace-model';

export function adminAntdTheme(appearance: AdminAppearance): ThemeConfig {
  const isDark = appearance === 'dark';
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#5b9cff' : '#1677ff',
      colorInfo: isDark ? '#5b9cff' : '#1677ff',
      colorSuccess: isDark ? '#73d13d' : '#52c41a',
      colorWarning: isDark ? '#ffc53d' : '#faad14',
      colorError: isDark ? '#ff7875' : '#ff4d4f',
      borderRadius: 6,
      controlHeight: 32,
      fontSize: 13,
    },
    components: {
      Layout: {
        siderBg: isDark ? '#111827' : '#001529',
        headerBg: isDark ? '#141414' : '#ffffff',
        bodyBg: isDark ? '#0f172a' : '#f5f5f5',
      },
      Menu: {
        darkItemBg: '#001529',
        darkItemSelectedBg: '#1677ff',
        itemHeight: 40,
      },
      Table: {
        cellPaddingBlock: 10,
        cellPaddingInline: 12,
        headerBg: '#fafafa',
      },
      Card: {
        bodyPadding: 16,
        headerHeight: 46,
      },
    },
  };
}
