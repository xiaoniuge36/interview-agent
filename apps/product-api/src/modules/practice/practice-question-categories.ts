import type { RoleCategory } from '../../common/role-category';

const ROLE_TAG_PREFIX = 'role:';
const COMPANY_TAG_PREFIX = 'company:';

export function practiceCategoryTagFor(category: RoleCategory): string {
  return `${ROLE_TAG_PREFIX}${category}`;
}

export function isPracticeCategoryTag(tag: string): boolean {
  return tag.startsWith(ROLE_TAG_PREFIX);
}

export function companyTagFor(company: string): string {
  return `${COMPANY_TAG_PREFIX}${company}`;
}

export function isCompanyTag(tag: string): boolean {
  return tag.startsWith(COMPANY_TAG_PREFIX);
}

export function companiesFromTags(tags: string[]): string[] {
  return tags
    .filter(isCompanyTag)
    .map((tag) => tag.slice(COMPANY_TAG_PREFIX.length).trim())
    .filter(Boolean);
}

/** 面向用户与 AI prompt 的能力标签：机器约定前缀（role:/company:）不外显。 */
export function visiblePracticeTags(tags: string[]): string[] {
  return tags.filter((tag) => !isPracticeCategoryTag(tag) && !isCompanyTag(tag));
}
