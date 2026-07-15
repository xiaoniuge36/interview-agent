import type { ThemeConfig } from 'antd';

export const adminAntdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    colorInfo: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 6,
    controlHeight: 32,
    fontSize: 13,
  },
  components: {
    Layout: {
      siderBg: '#001529',
      headerBg: '#ffffff',
      bodyBg: '#f5f5f5',
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
