import type {
  AgentRunView,
  AuditLogView,
  CandidateReview,
  ModelProfile,
  Question,
} from '@interview-agent/contracts';

type FilterValue<T extends string> = T | 'all';

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
  return candidates[0]?.id ?? null;
}

function matchesQuery(query: string, values: string[]): boolean {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalized) return true;
  return values.some((value) => value.toLocaleLowerCase('zh-CN').includes(normalized));
}

function matchesValue<T extends string>(value: T, filter: FilterValue<T>): boolean {
  return filter === 'all' || value === filter;
}
