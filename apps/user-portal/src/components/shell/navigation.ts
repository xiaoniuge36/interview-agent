export type NavigationId = 'home' | 'profile' | 'practice' | 'interview' | 'reports' | 'settings';

export type IconName = 'grid' | 'user' | 'target' | 'book' | 'mic' | 'chart' | 'settings';

export type NavigationItem = {
  id: NavigationId;
  href: string;
  label: string;
  title: string;
  helper: string;
  icon: IconName;
  step?: number;
};

/** C 端主导航：目标岗位从“我的 Agent”工作流进入，避免侧栏项过碎。 */
export const NAV_ITEMS: NavigationItem[] = [
  {
    id: 'home',
    href: '/home',
    label: '首页',
    title: 'Agent 工作台',
    helper: '查看今天的准备重点',
    icon: 'grid',
  },
  {
    id: 'profile',
    href: '/profile',
    label: '我的 Agent',
    title: '我的 Agent 档案',
    helper: '更新背景、目标与证据',
    icon: 'user',
    step: 1,
  },
  {
    id: 'interview',
    href: '/interview',
    label: '面试工作室',
    title: '模拟面试',
    helper: '开始真实追问与模拟',
    icon: 'mic',
    step: 2,
  },
  {
    id: 'practice',
    href: '/practice',
    label: '专项练习',
    title: '专项练习',
    helper: '打磨需要加强的表达',
    icon: 'book',
    step: 3,
  },
  {
    id: 'reports',
    href: '/reports',
    label: '复盘中心',
    title: '复盘中心',
    helper: '查看成长记录与建议',
    icon: 'chart',
    step: 4,
  },
  {
    id: 'settings',
    href: '/settings',
    label: '设置',
    title: '设置中心',
    helper: '模型、账户与通知偏好',
    icon: 'settings',
  },
];

export function navItemById(id: NavigationId): NavigationItem {
  return NAV_ITEMS.find((item) => item.id === id) ?? NAV_ITEMS[0]!;
}

export function navIdFromPathname(pathname: string): NavigationId {
  if (pathname === '/job' || pathname.startsWith('/job/')) return 'profile';
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  );
  return match?.id ?? 'home';
}
