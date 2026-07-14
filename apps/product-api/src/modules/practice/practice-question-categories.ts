import type { RoleCategory } from '../../common/role-category';

const ROLE_TAG_PREFIX = 'role:';

export function practiceCategoryTagFor(category: RoleCategory): string {
  return `${ROLE_TAG_PREFIX}${category}`;
}

export function isPracticeCategoryTag(tag: string): boolean {
  return tag.startsWith(ROLE_TAG_PREFIX);
}

export function visiblePracticeTags(tags: string[]): string[] {
  return tags.filter((tag) => !isPracticeCategoryTag(tag));
}
