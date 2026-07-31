import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, parse, relative, resolve } from 'node:path';

const WORKSPACE_SEARCH_DEPTH = 6;
const DOCUMENT_SCAN_DEPTH = 3;
const DEFAULT_REFERENCE_TRACK = '参考资料';
const DEFAULT_COURSE_TRACK = '学习路线';
const COURSE_SORT_FALLBACK = Number.MAX_SAFE_INTEGER;
const COURSE_KIND = 'course';
const REVIEW_HEADING_PATTERN = /自测|review/i;
export const TERTIARY_HEADING_DEPTH = 3;

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

type FrontmatterAttributes = {
  title?: string;
  date?: string;
  tags?: string[];
  kind?: string;
  track?: string;
  order?: string;
  level?: string;
  duration?: string;
  summary?: string;
};

export async function loadLearningDocuments(
  rootDirectory = resolveLearningDocumentsDirectory(),
): Promise<LearningDocument[]> {
  try {
    const sourceNames = await findMarkdownFiles(rootDirectory);
    const documents = await Promise.all(
      sourceNames.map((sourceName) => loadDocument(rootDirectory, sourceName)),
    );
    return documents
      .filter((document): document is LearningDocument => document !== null)
      .sort(compareDocuments);
  } catch {
    return [];
  }
}

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

export function resolveLearningDocumentsDirectory(startDirectory = process.cwd()): string {
  let currentDirectory = resolve(startDirectory);
  for (let depth = 0; depth < WORKSPACE_SEARCH_DEPTH; depth += 1) {
    const candidate = resolve(currentDirectory, '参考资料');
    if (existsSync(candidate)) return candidate;
    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) break;
    currentDirectory = parentDirectory;
  }
  return resolve(startDirectory, '..', '..', '参考资料');
}

async function findMarkdownFiles(rootDirectory: string): Promise<string[]> {
  return scanDirectory(rootDirectory, rootDirectory, 0);
}

async function scanDirectory(
  rootDirectory: string,
  currentDirectory: string,
  depth: number,
): Promise<string[]> {
  const entries = await readdir(currentDirectory, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = resolve(currentDirectory, entry.name);
      if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
        return [toPortablePath(relative(rootDirectory, absolutePath))];
      }
      if (entry.isDirectory() && depth < DOCUMENT_SCAN_DEPTH) {
        return scanDirectory(rootDirectory, absolutePath, depth + 1);
      }
      return [];
    }),
  );
  return results.flat();
}

async function loadDocument(
  rootDirectory: string,
  sourceName: string,
): Promise<LearningDocument | null> {
  try {
    const rawContent = await readFile(resolve(rootDirectory, sourceName), 'utf8');
    const { attributes, content } = parseFrontmatter(rawContent);
    const kind = parseDocumentKind(attributes.kind);
    return {
      slug: slugify(sourceName.replace(/\.md$/i, '')),
      sourceName,
      title: attributes.title ?? firstHeading(content) ?? parse(sourceName).name,
      date: attributes.date ?? null,
      tags: attributes.tags ?? [],
      kind,
      track: attributes.track ?? defaultTrack(kind),
      order: kind === COURSE_KIND ? parseInteger(attributes.order) : null,
      level: parseLearningLevel(attributes.level, kind),
      durationMinutes: kind === COURSE_KIND ? parseInteger(attributes.duration) : null,
      summary: attributes.summary ?? null,
      content,
      headings: extractHeadings(content),
    };
  } catch {
    return null;
  }
}

function parseFrontmatter(source: string): {
  attributes: FrontmatterAttributes;
  content: string;
} {
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  if (lines[0]?.trim() !== '---') return { attributes: {}, content: source };
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex < 0) return { attributes: {}, content: source };
  const values = readFrontmatterValues(lines.slice(1, closingIndex));
  return {
    attributes: buildAttributes(values),
    content: lines
      .slice(closingIndex + 1)
      .join('\n')
      .trim(),
  };
}

function readFrontmatterValues(lines: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 1) continue;
    values.set(line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim());
  }
  return values;
}

function buildAttributes(values: Map<string, string>): FrontmatterAttributes {
  const attributes: FrontmatterAttributes = { tags: parseTags(values.get('tags')) };
  for (const key of ['title', 'date', 'kind', 'track', 'order', 'level', 'duration', 'summary']) {
    const value = cleanScalar(values.get(key));
    if (value) attributes[key as keyof FrontmatterAttributes] = value as never;
  }
  return attributes;
}

function cleanScalar(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/^(?:"|')|(?:"|')$/g, '').trim() || undefined;
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((tag) => cleanScalar(tag))
    .filter((tag): tag is string => Boolean(tag));
}

function parseDocumentKind(value: string | undefined): LearningDocumentKind {
  return value === COURSE_KIND ? COURSE_KIND : 'reference';
}

function parseLearningLevel(value: string | undefined, kind: LearningDocumentKind): LearningLevel {
  if (value === 'foundation' || value === 'intermediate' || value === 'advanced') return value;
  return kind === COURSE_KIND ? 'foundation' : 'reference';
}

function parseInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function defaultTrack(kind: LearningDocumentKind): string {
  return kind === COURSE_KIND ? DEFAULT_COURSE_TRACK : DEFAULT_REFERENCE_TRACK;
}

function firstHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+?)\s*#*$/m);
  return match ? cleanHeading(match[1] ?? '') : null;
}

function extractHeadings(content: string): LearningHeading[] {
  const ids = new Map<string, number>();
  let fenceMarker: string | null = null;
  return content.split('\n').flatMap((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1]?.[0] ?? null;
    if (marker) {
      fenceMarker = fenceMarker === marker ? null : (fenceMarker ?? marker);
      return [];
    }
    if (fenceMarker) return [];
    return headingFromLine(line, ids);
  });
}

function headingFromLine(line: string, ids: Map<string, number>): LearningHeading[] {
  const match = line.match(/^(#{2,3})\s+(.+?)\s*#*$/);
  if (!match) return [];
  const title = cleanHeading(match[2] ?? '');
  const baseId = slugify(title);
  const count = (ids.get(baseId) ?? 0) + 1;
  ids.set(baseId, count);
  return [
    {
      depth: match[1]?.length === TERTIARY_HEADING_DEPTH ? TERTIARY_HEADING_DEPTH : 2,
      id: count === 1 ? baseId : `${baseId}-${count}`,
      title,
    },
  ];
}

function cleanHeading(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
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

function compareDocuments(left: LearningDocument, right: LearningDocument): number {
  if (left.kind !== right.kind) return left.kind === COURSE_KIND ? -1 : 1;
  if (left.kind === COURSE_KIND) {
    return (left.order ?? COURSE_SORT_FALLBACK) - (right.order ?? COURSE_SORT_FALLBACK);
  }
  const byDate = (right.date ?? '').localeCompare(left.date ?? '');
  return byDate || left.title.localeCompare(right.title, 'zh-CN');
}

function toPortablePath(path: string): string {
  return path.replaceAll('\\', '/');
}
