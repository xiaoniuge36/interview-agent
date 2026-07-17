export type NavigationId =
  'home' | 'questions' | 'profile' | 'practice' | 'interview' | 'reports' | 'settings';

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
    title: '题库大厅',
    helper: '搜索专题与继续最近练习',
    icon: 'grid',
  },
  {
    id: 'questions',
    href: '/questions',
    label: '自主刷题',
    title: '独立选题',
    helper: '筛选并组合 1–10 道题',
    icon: 'book',
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
    label: '练习空间',
    title: '沉浸式作答',
    helper: '继续当前题单与逐题复盘',
    icon: 'target',
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

export function navigationLinkClass(
  active: NavigationId,
  pending: NavigationId | null,
  item: NavigationId,
): string {
  if (pending) return pending === item ? 'active pending' : '';
  return active === item ? 'active' : '';
}
