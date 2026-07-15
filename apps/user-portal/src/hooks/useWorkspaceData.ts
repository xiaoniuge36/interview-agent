'use client';

import { useCallback, useEffect, useState } from 'react';
import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';
import { loadWorkspaceData, type WorkspaceData } from '@/lib/workspace-api';

type WorkspaceState = {
  status: 'loading' | 'ready' | 'error';
  data: WorkspaceData | null;
  error: Error | null;
};

const INITIAL_STATE: WorkspaceState = {
  status: 'loading',
  data: null,
  error: null,
};

export function useWorkspaceData() {
  const [state, setState] = useState<WorkspaceState>(INITIAL_STATE);
  const reload = useCallback(async () => {
    setState(INITIAL_STATE);
    try {
      const data = await loadWorkspaceData();
      setState({ status: 'ready', data, error: null });
    } catch (error) {
      setState({ status: 'error', data: null, error: toError(error) });
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const updateProfile = useCallback((profile: ProfilePayload) => {
    setState((current) => updateData(current, { profile }));
  }, []);
  const addJob = useCallback((job: JobIntentPayload) => {
    setState((current) => updateData(current, { job }));
  }, []);
  return { state, reload, updateProfile, addJob };
}

function updateData(
  state: WorkspaceState,
  update: { profile?: ProfilePayload; job?: JobIntentPayload },
): WorkspaceState {
  if (!state.data) return state;
  return {
    status: 'ready',
    data: {
      profile: update.profile ?? state.data.profile,
      jobs: update.job ? [update.job, ...state.data.jobs] : state.data.jobs,
      interviews: state.data.interviews,
    },
    error: null,
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('加载工作台失败。');
}
