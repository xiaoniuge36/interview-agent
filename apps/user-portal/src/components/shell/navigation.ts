export type NavigationId = 'workspace' | 'profile' | 'job-intent' | 'interview' | 'reports';
export type IconName = 'grid' | 'user' | 'target' | 'mic' | 'chart';

export type NavigationItem = { id: NavigationId; label: string; helper: string; icon: IconName };

export const NAV_ITEMS: NavigationItem[] = [
  { id: 'workspace', label: '训练总览', helper: '查看当前计划', icon: 'grid' },
  { id: 'profile', label: '个人画像', helper: '沉淀能力证据', icon: 'user' },
  { id: 'job-intent', label: '目标岗位', helper: '匹配真实 JD', icon: 'target' },
  { id: 'interview', label: '模拟面试', helper: '实战逐题作答', icon: 'mic' },
  { id: 'reports', label: '复盘报告', helper: '回看改进建议', icon: 'chart' },
];
