import {
  ADMIN_NAV_ITEMS,
  canAccessAdminView,
  type AdminNavigationItem,
} from '@/components/admin-navigation';

export type CommandSectionKey = 'favorites' | 'recent' | 'all' | 'results';

export type CommandSection = {
  key: CommandSectionKey;
  title: string;
  items: AdminNavigationItem[];
};

const COMMAND_SECTION_TITLES: Record<CommandSectionKey, string> = {
  favorites: '我的收藏',
  recent: '最近访问',
  all: '全部模块',
  results: '搜索结果',
};

export function findCommandItems(query: string, role: string | undefined): AdminNavigationItem[] {
  const keyword = query.trim().toLowerCase();
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (!canAccessAdminView(role, item.id)) return false;
    return !keyword || matchesKeyword(item, keyword);
  });
}

export function itemsForViews(
  views: readonly AdminNavigationItem['id'][],
  role: string | undefined,
): AdminNavigationItem[] {
  return views
    .map((view) => ADMIN_NAV_ITEMS.find((item) => item.id === view))
    .filter((item): item is AdminNavigationItem => Boolean(item))
    .filter((item) => canAccessAdminView(role, item.id));
}

export function buildCommandSections(options: {
  query: string;
  role: string | undefined;
  favoriteViews: readonly AdminNavigationItem['id'][];
  recentViews: readonly AdminNavigationItem['id'][];
}): CommandSection[] {
  if (options.query.trim())
    return [commandSection('results', findCommandItems(options.query, options.role))];

  const favorites = itemsForViews(options.favoriteViews, options.role);
  const favoriteIds = new Set(favorites.map((item) => item.id));
  const recent = itemsForViews(options.recentViews, options.role).filter(
    (item) => !favoriteIds.has(item.id),
  );
  const prioritizedIds = new Set([...favoriteIds, ...recent.map((item) => item.id)]);
  const remaining = findCommandItems('', options.role).filter(
    (item) => !prioritizedIds.has(item.id),
  );

  return [
    commandSection('favorites', favorites),
    commandSection('recent', recent),
    commandSection('all', remaining),
  ].filter((section) => section.items.length > 0);
}

export function flattenCommandSections(sections: readonly CommandSection[]) {
  return sections.flatMap((section) => section.items);
}

export function moveCommandSelection(
  currentIndex: number,
  direction: -1 | 1,
  itemCount: number,
): number {
  if (itemCount <= 0) return -1;
  const startIndex = currentIndex < 0 ? (direction > 0 ? -1 : 0) : currentIndex;
  return (startIndex + direction + itemCount) % itemCount;
}

function commandSection(key: CommandSectionKey, items: AdminNavigationItem[]): CommandSection {
  return { key, title: COMMAND_SECTION_TITLES[key], items };
}

function matchesKeyword(item: AdminNavigationItem, keyword: string): boolean {
  return [item.label, item.helper, item.heading].some((value) =>
    value.toLowerCase().includes(keyword),
  );
}
