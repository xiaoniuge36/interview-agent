import type {
  AgentRunView,
  AuditLogView,
  CandidateReview,
  ModelProfile,
  Question,
} from '@interview-agent/contracts';

type FilterValue<T extends string> = T | 'all';

const MAX_VISIBLE_PAGE_COUNT = 7;
const EDGE_VISIBLE_PAGE_COUNT = MAX_VISIBLE_PAGE_COUNT - 1;
const MIDDLE_PAGE_RADIUS = Math.floor((MAX_VISIBLE_PAGE_COUNT - 2) / 2);
const EDGE_PAGE_THRESHOLD = EDGE_VISIBLE_PAGE_COUNT - MIDDLE_PAGE_RADIUS;

export const PAGINATION_ELLIPSIS = 'ellipsis' as const;
type PaginationPage = number | typeof PAGINATION_ELLIPSIS;

export type QuestionFilters = {
  query: string;
  status: FilterValue<Question['status']>;
  difficulty: FilterValue<Question['difficulty']>;
};

export type CandidateFilters = {
  query: string;
  status: FilterValue<CandidateReview['status']>;
};

export type ModelFilters = {
  query: string;
  status: FilterValue<ModelProfile['status']>;
};

export type RunFilters = {
  query: string;
  status: FilterValue<AgentRunView['status']>;
};

export type AuditFilters = {
  query: string;
  result: FilterValue<AuditLogView['result']>;
};

export function filterQuestions(records: Question[], filters: QuestionFilters): Question[] {
  return records.filter(
    (record) =>
      matchesQuery(filters.query, [record.title, record.stem, record.type, ...record.tags]) &&
      matchesValue(record.status, filters.status) &&
      matchesValue(record.difficulty, filters.difficulty),
  );
}

export function filterCandidates(
  records: CandidateReview[],
  filters: CandidateFilters,
): CandidateReview[] {
  return records.filter(
    (record) =>
      matchesQuery(filters.query, [record.title, ...record.tags, ...record.sourceRefs]) &&
      matchesValue(record.status, filters.status),
  );
}

export function filterModels(records: ModelProfile[], filters: ModelFilters): ModelProfile[] {
  return records.filter(
    (record) =>
      matchesQuery(filters.query, [record.provider, record.model, record.purpose]) &&
      matchesValue(record.status, filters.status),
  );
}

export function filterRuns(records: AgentRunView[], filters: RunFilters): AgentRunView[] {
  return records.filter(
    (record) =>
      matchesQuery(filters.query, [record.stage, record.traceId]) &&
      matchesValue(record.status, filters.status),
  );
}

export function filterAuditLogs(records: AuditLogView[], filters: AuditFilters): AuditLogView[] {
  return records.filter(
    (record) =>
      matchesQuery(filters.query, [
        record.action,
        record.resourceType,
        record.resourceId,
        record.actorId,
        record.actorRole,
        record.traceId,
      ]) && matchesValue(record.result, filters.result),
  );
}

export function paginateRecords<T>(records: T[], requestedPage: number, pageSize: number) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(records.length / safePageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), pageCount);
  const start = (page - 1) * safePageSize;
  return {
    items: records.slice(start, start + safePageSize),
    page,
    pageCount,
    total: records.length,
  };
}

export function paginationPages(page: number, pageCount: number): PaginationPage[] {
  const totalPages = Math.max(0, Math.floor(pageCount));
  if (totalPages <= MAX_VISIBLE_PAGE_COUNT) return pageRange(1, totalPages);

  const currentPage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  if (currentPage <= EDGE_PAGE_THRESHOLD) {
    return [...pageRange(1, EDGE_VISIBLE_PAGE_COUNT), PAGINATION_ELLIPSIS, totalPages];
  }
  if (currentPage > totalPages - EDGE_PAGE_THRESHOLD) {
    return [
      1,
      PAGINATION_ELLIPSIS,
      ...pageRange(totalPages - EDGE_VISIBLE_PAGE_COUNT + 1, totalPages),
    ];
  }
  return [
    1,
    PAGINATION_ELLIPSIS,
    ...pageRange(currentPage - MIDDLE_PAGE_RADIUS, currentPage + MIDDLE_PAGE_RADIUS),
    PAGINATION_ELLIPSIS,
    totalPages,
  ];
}

export function resolveCandidateSelection(
  candidates: CandidateReview[],
  currentId: string | null,
  requestedId: string | null,
): string | null {
  if (requestedId && candidates.some((candidate) => candidate.id === requestedId)) {
    return requestedId;
  }
  if (currentId && candidates.some((candidate) => candidate.id === currentId)) {
    return currentId;
  }
  return null;
}

function pageRange(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function matchesQuery(query: string, values: string[]): boolean {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalized) return true;
  return values.some((value) => value.toLocaleLowerCase('zh-CN').includes(normalized));
}

function matchesValue<T extends string>(value: T, filter: FilterValue<T>): boolean {
  return filter === 'all' || value === filter;
}
