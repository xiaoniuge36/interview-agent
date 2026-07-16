'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { AdminApiError } from '@/lib/api';
import {
  queryAdminList,
  type AdminListItemMap,
  type AdminListQueryInput,
  type AdminListResource,
  type AdminPagedResponse,
} from '@/lib/admin-list-api';

const HTTP_FORBIDDEN = 403;
const FIRST_PAGE = 1;

export type AdminListAccess = 'required' | 'admin-only';
export type AdminPagedListState<Item> =
  | { status: 'loading' }
  | { status: 'ready'; data: AdminPagedResponse<Item> }
  | { status: 'forbidden'; access: AdminListAccess }
  | { status: 'error'; error: AdminApiError };

export type UseAdminPagedListOptions<Resource extends AdminListResource> = {
  access?: AdminListAccess;
  enabled?: boolean;
  initialQuery?: AdminListQueryInput<Resource>;
  reloadKey?: number;
};

export type AdminPagedListController<Resource extends AdminListResource> = {
  state: AdminPagedListState<AdminListItemMap[Resource]>;
  draftQuery: AdminListQueryInput<Resource>;
  submittedQuery: AdminListQueryInput<Resource>;
  isInitialQueryPending: boolean;
  isLoading: boolean;
  setDraftQuery: Dispatch<SetStateAction<AdminListQueryInput<Resource>>>;
  query: () => void;
  reset: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  reload: () => void;
};

const DEFAULT_ACCESS: Record<AdminListResource, AdminListAccess> = {
  imports: 'required',
  questions: 'required',
  candidates: 'required',
  'model-profiles': 'admin-only',
  'agent-runs': 'admin-only',
  'audit-logs': 'admin-only',
};

export function useAdminPagedList<Resource extends AdminListResource>(
  resource: Resource,
  options: UseAdminPagedListOptions<Resource> = {},
): AdminPagedListController<Resource> {
  const initialQueryKey = JSON.stringify(options.initialQuery ?? {});
  const initialQuery = useMemo(
    () => createAdminListInitialQuery(JSON.parse(initialQueryKey) as AdminListQueryInput<Resource>),
    [initialQueryKey],
  );
  const queryState = useAdminListQueryState(initialQuery, initialQueryKey, options.reloadKey);
  const [state, setState] = useState<AdminPagedListState<AdminListItemMap[Resource]>>({
    status: 'loading',
  });
  const access = options.access ?? DEFAULT_ACCESS[resource];
  useAdminListRequest({
    resource,
    submittedQuery: queryState.submittedQuery,
    access,
    enabled: shouldRequestAdminList(options.enabled ?? true, queryState.isInitialQueryPending),
    requestVersion: queryState.requestVersion,
    setState,
  });

  const query = () => {
    queryState.setSubmittedQuery(createAdminListSearchQuery(resource, queryState.draftQuery));
    queryState.reload();
  };
  const reset = () => queryState.reset();
  const setPage = (page: number) => {
    queryState.setSubmittedQuery((current) => createAdminListPageQuery(resource, current, page));
  };
  const setPageSize = (pageSize: number) => {
    queryState.setSubmittedQuery((current) => ({ ...current, page: FIRST_PAGE, pageSize }));
  };

  return {
    state,
    draftQuery: queryState.draftQuery,
    submittedQuery: queryState.submittedQuery,
    isInitialQueryPending: queryState.isInitialQueryPending,
    isLoading: state.status === 'loading' || queryState.isInitialQueryPending,
    setDraftQuery: queryState.setDraftQuery,
    query,
    reset,
    setPage,
    setPageSize,
    reload: queryState.reload,
  };
}

type AdminListQueryState<Resource extends AdminListResource> = {
  draftQuery: AdminListQueryInput<Resource>;
  submittedQuery: AdminListQueryInput<Resource>;
  isInitialQueryPending: boolean;
  requestVersion: number;
  setDraftQuery: Dispatch<SetStateAction<AdminListQueryInput<Resource>>>;
  setSubmittedQuery: Dispatch<SetStateAction<AdminListQueryInput<Resource>>>;
  reset: () => void;
  reload: () => void;
};

function useAdminListQueryState<Resource extends AdminListResource>(
  initialQuery: AdminListQueryInput<Resource>,
  initialQueryKey: string,
  reloadKey: number | undefined,
): AdminListQueryState<Resource> {
  const initialQueryRef = useRef(initialQuery);
  const appliedInitialQueryKey = useRef(initialQueryKey);
  const appliedReloadKey = useRef(reloadKey ?? 0);
  const [draftQuery, setDraftQuery] = useState<AdminListQueryInput<Resource>>(() => initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState<AdminListQueryInput<Resource>>(
    () => initialQuery,
  );
  const [requestVersion, setRequestVersion] = useState(0);
  const isInitialQueryPending = appliedInitialQueryKey.current !== initialQueryKey;

  useEffect(() => {
    if (appliedInitialQueryKey.current === initialQueryKey) return;
    initialQueryRef.current = initialQuery;
    appliedInitialQueryKey.current = initialQueryKey;
    setDraftQuery(initialQuery);
    setSubmittedQuery(initialQuery);
    setRequestVersion((value) => value + 1);
  }, [initialQuery, initialQueryKey]);

  useEffect(() => {
    const normalizedReloadKey = reloadKey ?? 0;
    if (appliedReloadKey.current === normalizedReloadKey) return;
    appliedReloadKey.current = normalizedReloadKey;
    setRequestVersion((value) => value + 1);
  }, [reloadKey]);

  const reload = () => setRequestVersion((value) => value + 1);
  const reset = () => {
    const nextQuery = initialQueryRef.current;
    setDraftQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    reload();
  };
  return {
    draftQuery,
    submittedQuery,
    isInitialQueryPending,
    requestVersion,
    setDraftQuery,
    setSubmittedQuery,
    reset,
    reload,
  };
}

export function shouldRequestAdminList(enabled: boolean, isInitialQueryPending: boolean): boolean {
  return enabled && !isInitialQueryPending;
}

type AdminListRequestOptions<Resource extends AdminListResource> = {
  resource: Resource;
  submittedQuery: AdminListQueryInput<Resource>;
  access: AdminListAccess;
  enabled: boolean;
  requestVersion: number;
  setState: Dispatch<SetStateAction<AdminPagedListState<AdminListItemMap[Resource]>>>;
};

function useAdminListRequest<Resource extends AdminListResource>(
  options: AdminListRequestOptions<Resource>,
): void {
  const { access, enabled, requestVersion, resource, setState, submittedQuery } = options;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    setState({ status: 'loading' });
    void resolveAdminPagedList(
      () => queryAdminList(resource, submittedQuery, controller.signal),
      access,
    ).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [access, enabled, requestVersion, resource, setState, submittedQuery]);
}

export function createAdminListSearchQuery<Resource extends AdminListResource>(
  resource: Resource,
  draftQuery: AdminListQueryInput<Resource>,
): AdminListQueryInput<Resource> {
  void resource;
  return { ...draftQuery, page: FIRST_PAGE };
}

export function createAdminListPageQuery<Resource extends AdminListResource>(
  resource: Resource,
  submittedQuery: AdminListQueryInput<Resource>,
  page: number,
): AdminListQueryInput<Resource> {
  void resource;
  return { ...submittedQuery, page: normalizePage(page) };
}

export async function resolveAdminPagedList<Item>(
  load: () => Promise<AdminPagedResponse<Item>>,
  access: AdminListAccess,
): Promise<AdminPagedListState<Item>> {
  try {
    return { status: 'ready', data: await load() };
  } catch (error) {
    const normalizedError = normalizeAdminListError(error);
    if (normalizedError.status === HTTP_FORBIDDEN) {
      return { status: 'forbidden', access };
    }
    return { status: 'error', error: normalizedError };
  }
}

function createAdminListInitialQuery<Resource extends AdminListResource>(
  input: AdminListQueryInput<Resource> | undefined,
): AdminListQueryInput<Resource> {
  return { ...(input ?? {}), page: input?.page ?? FIRST_PAGE } as AdminListQueryInput<Resource>;
}

function normalizePage(page: number): number {
  if (!Number.isFinite(page)) return FIRST_PAGE;
  return Math.max(FIRST_PAGE, Math.floor(page));
}

function normalizeAdminListError(error: unknown): AdminApiError {
  if (error instanceof AdminApiError) return error;
  return new AdminApiError({
    message: error instanceof Error ? error.message : '管理端列表加载失败。',
    code: 'UNEXPECTED_ADMIN_ERROR',
    cause: error,
  });
}
