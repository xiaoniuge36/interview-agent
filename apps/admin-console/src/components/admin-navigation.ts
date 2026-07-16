import type { ConsoleIconName } from './ConsoleIcon';

export const ADMIN_VIEW_IDS = [
  'overview',
  'analytics',
  'imports',
  'questions',
  'content',
  'models',
  'runtime',
  'audit',
  'accounts',
] as const;

export type AdminView = (typeof ADMIN_VIEW_IDS)[number];

export type AdminViewParams = {
  importTaskId?: string;
};

export type AdminViewLocation = {
  view: AdminView;
  params: AdminViewParams;
};

export type AdminNavigationItem = {
  id: AdminView;
  label: string;
  helper: string;
  heading: string;
  icon: ConsoleIconName;
};

export type AdminNavigationGroup = {
  id: 'overview' | 'content' | 'observability' | 'platform';
  label: string;
  items: readonly AdminNavigationItem[];
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
    id: 'analytics',
    label: '数据看板',
    helper: '全站运营数据',
    heading: '平台运营数据看板',
    icon: 'analytics',
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
    label: '题库管理',
    helper: '正式题库',
    heading: '正式题库管理',
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
  {
    id: 'accounts',
    label: '账号管理',
    helper: '全站账号治理',
    heading: '平台账号管理',
    icon: 'accounts',
  },
];

export const ADMIN_NAV_GROUPS: readonly AdminNavigationGroup[] = [
  {
    id: 'overview',
    label: '运营总览',
    items: ADMIN_NAV_ITEMS.filter((item) => ['overview', 'analytics'].includes(item.id)),
  },
  {
    id: 'content',
    label: '内容治理',
    items: ADMIN_NAV_ITEMS.filter((item) => ['imports', 'questions', 'content'].includes(item.id)),
  },
  {
    id: 'observability',
    label: '系统观测',
    items: ADMIN_NAV_ITEMS.filter((item) => ['models', 'runtime', 'audit'].includes(item.id)),
  },
  {
    id: 'platform',
    label: '平台治理',
    items: ADMIN_NAV_ITEMS.filter((item) => item.id === 'accounts'),
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

const IMPORT_TASK_ID_MAX_LENGTH = 160;
const REVIEWER_VIEWS = new Set<AdminView>(['overview', 'imports', 'questions', 'content']);

export function isAdminView(value: string): value is AdminView {
  return ADMIN_VIEW_IDS.some((view) => view === value);
}

export function isPlatformView(view: AdminView): boolean {
  return view === 'analytics' || view === 'accounts';
}

export function canAccessAdminView(role: string | undefined, view: AdminView): boolean {
  if (role === 'platform_admin') return true;
  if (role === 'admin') return !isPlatformView(view);
  return role === 'question_reviewer' && REVIEWER_VIEWS.has(view);
}

export function resolveAdminViewForRole(role: string | undefined, view: AdminView): AdminView {
  return canAccessAdminView(role, view) ? view : 'overview';
}

export function adminViewFromHash(hash: string): AdminView {
  return adminViewLocationFromHash(hash).view;
}

export function adminViewLocationFromHash(hash: string): AdminViewLocation {
  const [rawView, rawParams] = splitHash(hash);
  const view = isAdminView(rawView) ? rawView : (LEGACY_HASHES[rawView] ?? 'overview');
  return { view, params: view === 'content' ? parseContentParams(rawParams) : {} };
}

export function adminViewHash(view: AdminView, params: AdminViewParams = {}): string {
  const importTaskId = view === 'content' ? normalizeImportTaskId(params.importTaskId) : undefined;
  return importTaskId ? `#${view}?importTaskId=${encodeURIComponent(importTaskId)}` : `#${view}`;
}

export function getAdminNavigationItem(view: AdminView): AdminNavigationItem {
  const item = ADMIN_NAV_ITEMS.find((candidate) => candidate.id === view);
  if (!item) throw new Error(`Unknown admin view: ${view}`);
  return item;
}

function splitHash(hash: string): [string, string] {
  const value = hash.replace(/^#/, '');
  const separator = value.indexOf('?');
  return separator === -1 ? [value, ''] : [value.slice(0, separator), value.slice(separator + 1)];
}

function parseContentParams(rawParams: string): AdminViewParams {
  const importTaskId = normalizeImportTaskId(new URLSearchParams(rawParams).get('importTaskId'));
  return importTaskId ? { importTaskId } : {};
}

function normalizeImportTaskId(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > IMPORT_TASK_ID_MAX_LENGTH) return undefined;
  return normalized;
}
