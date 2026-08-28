/**
 * 学习文档的类型与纯函数模型：客户端组件从这里导入，
 * 避免把 learning-documents.ts 的 node:fs 依赖带进浏览器 chunk。
 */

export const TERTIARY_HEADING_DEPTH = 3;
const REVIEW_HEADING_PATTERN = /自测|review/i;

export type LearningDocumentKind = 'course' | 'reference';
export type LearningLevel = 'foundation' | 'intermediate' | 'advanced' | 'reference';

export type LearningHeading = {
  depth: 2 | typeof TERTIARY_HEADING_DEPTH;
  id: string;
  title: string;
};

export type LearningDocument = {
  slug: string;
  sourceName: string;
  title: string;
  date: string | null;
  tags: string[];
  kind: LearningDocumentKind;
  track: string;
  order: number | null;
  level: LearningLevel;
  durationMinutes: number | null;
  summary: string | null;
  content: string;
  headings: LearningHeading[];
};

export function selectLearningDocument<T extends { slug: string }>(
  documents: readonly T[],
  requestedSlug: string | string[] | undefined,
): T | null {
  return findRequestedLearningDocument(documents, requestedSlug) ?? documents[0] ?? null;
}

export function findRequestedLearningDocument<T extends { slug: string }>(
  documents: readonly T[],
  requestedSlug: string | string[] | undefined,
): T | null {
  const slug = Array.isArray(requestedSlug) ? requestedSlug[0] : requestedSlug;
  if (!slug) return null;
  return documents.find((document) => document.slug === slug) ?? null;
}

export function findLearningReviewHeading(
  headings: readonly LearningHeading[],
): LearningHeading | null {
  for (let index = headings.length - 1; index >= 0; index -= 1) {
    const heading = headings[index];
    if (heading && REVIEW_HEADING_PATTERN.test(heading.title)) return heading;
  }
  return null;
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'document'
  );
}
