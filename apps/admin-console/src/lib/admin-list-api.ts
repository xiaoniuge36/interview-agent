import {
  AdminPageSchema,
  AgentRunListQuerySchema,
  AgentRunViewSchema,
  AuditLogListQuerySchema,
  AuditLogViewSchema,
  CandidateReviewListQuerySchema,
  CandidateReviewSchema,
  ImportTaskListQuerySchema,
  ImportTaskSchema,
  ModelProfileListQuerySchema,
  ModelProfileSchema,
  QuestionListQuerySchema,
  QuestionSchema,
  type AgentRunListQuery,
  type AgentRunView,
  type AuditLogListQuery,
  type AuditLogView,
  type CandidateReview,
  type CandidateReviewListQuery,
  type ImportTask,
  type ImportTaskListQuery,
  type ModelProfile,
  type ModelProfileListQuery,
  type Question,
  type QuestionListQuery,
} from '@interview-agent/contracts';
import type { ZodType } from 'zod';
import {
  adminDownload,
  adminRequest,
  type AdminApiBlobRequest,
  type AdminApiRequest,
  type AdminDownloadedFile,
} from './api';

type PaginationFields = 'page' | 'pageSize';
const EMPTY_ADMIN_LIST_QUERY = {} as never;

export type AdminPagedResponse<Item> = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminListItemMap = {
  imports: ImportTask;
  questions: Question;
  candidates: CandidateReview;
  'model-profiles': ModelProfile;
  'agent-runs': AgentRunView;
  'audit-logs': AuditLogView;
};

export type AdminListQueryMap = {
  imports: ImportTaskListQuery;
  questions: QuestionListQuery;
  candidates: CandidateReviewListQuery;
  'model-profiles': ModelProfileListQuery;
  'agent-runs': AgentRunListQuery;
  'audit-logs': AuditLogListQuery;
};

export type AdminListResource = keyof AdminListItemMap;
export type AdminListQueryInput<Resource extends AdminListResource> = Omit<
  AdminListQueryMap[Resource],
  PaginationFields
> &
  Partial<Pick<AdminListQueryMap[Resource], PaginationFields>>;

type AdminListDefinition<Item, Query extends object> = {
  path: string;
  querySchema: ZodType<Query>;
  pageSchema: ZodType<AdminPagedResponse<Item>>;
  fallbackFileName: string;
};

const ADMIN_LIST_DEFINITIONS = {
  imports: {
    path: '/admin/imports',
    querySchema: ImportTaskListQuerySchema,
    pageSchema: AdminPageSchema(ImportTaskSchema),
    fallbackFileName: 'imports.csv',
  },
  questions: {
    path: '/admin/questions',
    querySchema: QuestionListQuerySchema,
    pageSchema: AdminPageSchema(QuestionSchema),
    fallbackFileName: 'questions.csv',
  },
  candidates: {
    path: '/admin/candidates',
    querySchema: CandidateReviewListQuerySchema,
    pageSchema: AdminPageSchema(CandidateReviewSchema),
    fallbackFileName: 'candidates.csv',
  },
  'model-profiles': {
    path: '/admin/model-profiles',
    querySchema: ModelProfileListQuerySchema,
    pageSchema: AdminPageSchema(ModelProfileSchema),
    fallbackFileName: 'model-profiles.csv',
  },
  'agent-runs': {
    path: '/admin/agent-runs',
    querySchema: AgentRunListQuerySchema,
    pageSchema: AdminPageSchema(AgentRunViewSchema),
    fallbackFileName: 'agent-runs.csv',
  },
  'audit-logs': {
    path: '/admin/audit-logs',
    querySchema: AuditLogListQuerySchema,
    pageSchema: AdminPageSchema(AuditLogViewSchema),
    fallbackFileName: 'audit-logs.csv',
  },
} as const;

export function createAdminListQueryRequest<Resource extends AdminListResource>(
  resource: Resource,
  input: AdminListQueryInput<Resource> = EMPTY_ADMIN_LIST_QUERY,
): AdminApiRequest<AdminPagedResponse<AdminListItemMap[Resource]>> {
  const definition = getAdminListDefinition(resource);
  return {
    path: createAdminListPath(definition, { action: 'query', input, includePagination: true }),
    schema: definition.pageSchema,
  };
}

export function createAdminListExportRequest<Resource extends AdminListResource>(
  resource: Resource,
  input: AdminListQueryInput<Resource> = EMPTY_ADMIN_LIST_QUERY,
): AdminApiBlobRequest {
  const definition = getAdminListDefinition(resource);
  return {
    path: createAdminListPath(definition, { action: 'export', input, includePagination: false }),
    fallbackFileName: definition.fallbackFileName,
  };
}

export function queryAdminList<Resource extends AdminListResource>(
  resource: Resource,
  input: AdminListQueryInput<Resource> = EMPTY_ADMIN_LIST_QUERY,
  signal?: AbortSignal,
): Promise<AdminPagedResponse<AdminListItemMap[Resource]>> {
  const request = createAdminListQueryRequest(resource, input);
  return adminRequest({ ...request, ...(signal ? { init: { signal } } : {}) });
}

export function exportAdminList<Resource extends AdminListResource>(
  resource: Resource,
  input: AdminListQueryInput<Resource> = EMPTY_ADMIN_LIST_QUERY,
): Promise<AdminDownloadedFile> {
  return adminDownload(createAdminListExportRequest(resource, input));
}

export async function downloadAdminList<Resource extends AdminListResource>(
  resource: Resource,
  input: AdminListQueryInput<Resource> = EMPTY_ADMIN_LIST_QUERY,
): Promise<AdminDownloadedFile> {
  const download = await exportAdminList(resource, input);
  saveAdminDownloadedFile(download);
  return download;
}

export function saveAdminDownloadedFile(download: AdminDownloadedFile): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(download.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = download.fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getAdminListDefinition<Resource extends AdminListResource>(
  resource: Resource,
): AdminListDefinition<AdminListItemMap[Resource], AdminListQueryMap[Resource]> {
  return ADMIN_LIST_DEFINITIONS[resource] as unknown as AdminListDefinition<
    AdminListItemMap[Resource],
    AdminListQueryMap[Resource]
  >;
}

type AdminListPathOptions<Resource extends AdminListResource> = {
  action: 'query' | 'export';
  input: AdminListQueryInput<Resource>;
  includePagination: boolean;
};

function createAdminListPath<Resource extends AdminListResource>(
  definition: AdminListDefinition<AdminListItemMap[Resource], AdminListQueryMap[Resource]>,
  options: AdminListPathOptions<Resource>,
): string {
  const { action, includePagination, input } = options;
  const parsed = definition.querySchema.parse(input);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed)) {
    if (shouldSkipQueryParameter(key, value, includePagination)) continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return `${definition.path}/${action}${search ? `?${search}` : ''}`;
}

function shouldSkipQueryParameter(
  key: string,
  value: unknown,
  includePagination: boolean,
): boolean {
  if (value === undefined || value === '') return true;
  return !includePagination && (key === 'page' || key === 'pageSize');
}
