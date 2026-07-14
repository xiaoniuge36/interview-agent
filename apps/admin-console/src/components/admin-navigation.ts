import type { ConsoleIconName } from './ConsoleIcon';

export const ADMIN_VIEW_IDS = [
  'overview',
  'imports',
  'questions',
  'content',
  'models',
  'runtime',
  'audit',
] as const;

export type AdminView = (typeof ADMIN_VIEW_IDS)[number];

export type AdminNavigationItem = {
  id: AdminView;
  label: string;
  helper: string;
  heading: string;
  icon: ConsoleIconName;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavigationItem[] = [
  {
    id: 'overview',
    label: '治理总览',
    helper: '关键指标',
    heading: '运营与治理全局视图',
    icon: 'overview',
  },
  {
    id: 'imports',
    label: '资料导入',
    helper: '来源资产',
    heading: '训练资料导入中心',
    icon: 'import',
  },
  {
    id: 'questions',
    label: '题库审核',
    helper: '发布与候选题',
    heading: '题库审核与发布',
    icon: 'review',
  },
  {
    id: 'content',
    label: '审核工作台',
    helper: '编辑与发布',
    heading: '候选题审核工作台',
    icon: 'workspace',
  },
  {
    id: 'models',
    label: '模型治理',
    helper: '路由与预算',
    heading: '模型策略与预算治理',
    icon: 'model',
  },
  {
    id: 'runtime',
    label: '运行观测',
    helper: 'Agent 健康度',
    heading: 'Agent 运行与健康观测',
    icon: 'activity',
  },
  {
    id: 'audit',
    label: '审计日志',
    helper: '可追溯记录',
    heading: '治理审计与可追溯记录',
    icon: 'audit',
  },
];

const LEGACY_HASHES: Readonly<Record<string, AdminView>> = {
  'section-0': 'overview',
  'section-1': 'imports',
  'section-2': 'questions',
  'section-3': 'content',
  'section-4': 'models',
  'section-5': 'runtime',
  'section-6': 'audit',
};

export function isAdminView(value: string): value is AdminView {
  return ADMIN_VIEW_IDS.some((view) => view === value);
}

export function adminViewFromHash(hash: string): AdminView {
  const view = hash.replace(/^#/, '');
  if (isAdminView(view)) return view;
  return LEGACY_HASHES[view] ?? 'overview';
}

export function adminViewHash(view: AdminView): string {
  return `#${view}`;
}

export function getAdminNavigationItem(view: AdminView): AdminNavigationItem {
  const item = ADMIN_NAV_ITEMS.find((candidate) => candidate.id === view);
  if (!item) throw new Error(`Unknown admin view: ${view}`);
  return item;
}
