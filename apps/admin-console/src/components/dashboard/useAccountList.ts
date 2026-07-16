'use client';

import { useEffect, useState } from 'react';
import type { AccountQueryInput } from '@/lib/account-api';
import { queryAccounts } from '@/lib/account-api';
import { AdminApiError } from '@/lib/api';
import type { AccountListState } from './account-management.types';

const HTTP_FORBIDDEN = 403;

export function useAccountList(
  active: boolean,
  query: AccountQueryInput,
  refreshKey: number,
): AccountListState {
  const [state, setState] = useState<AccountListState>({ status: 'loading' });
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    void queryAccounts(query, controller.signal).then(
      (data) => setState({ status: 'ready', data }),
      (error: unknown) => applyListError(error, controller.signal, setState),
    );
    return () => controller.abort();
  }, [active, query, refreshKey]);
  return state;
}

function applyListError(
  error: unknown,
  signal: AbortSignal,
  setState: (state: AccountListState) => void,
) {
  if (signal.aborted) return;
  const normalized =
    error instanceof AdminApiError
      ? error
      : new AdminApiError({
          message: '账号列表加载失败。',
          code: 'ACCOUNT_LIST_ERROR',
          cause: error,
        });
  setState(
    normalized.status === HTTP_FORBIDDEN
      ? { status: 'forbidden', access: 'platform-only' }
      : { status: 'error', error: normalized },
  );
}
