'use client';

import { useCallback, useEffect, useState } from 'react';
import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';
import { loadWorkspaceData, type WorkspaceData } from '../lib/workspace-api';

type WorkspaceState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: WorkspaceData | null;
  error: Error | null;
};

type LatestWorkspaceHandlers<T> = {
  load: () => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (reason: unknown) => void;
};

const IDLE_STATE: WorkspaceState = {
  status: 'idle',
  data: null,
  error: null,
};

const INITIAL_STATE: WorkspaceState = {
  status: 'loading',
  data: null,
  error: null,
};

export function useWorkspaceData(options: { loadOnMount?: boolean } = {}) {
  const [state, setState] = useState<WorkspaceState>(() =>
    options.loadOnMount === false ? IDLE_STATE : INITIAL_STATE,
  );
  const [loadWorkspace] = useState(() => createWorkspaceLoader());
  const [request] = useState(createLatestWorkspaceRequest);
  const reload = useCallback(async () => {
    setState(INITIAL_STATE);
    await request.run({
      load: loadWorkspace,
      onSuccess: (data) => setState({ status: 'ready', data, error: null }),
      onError: (error) => setState({ status: 'error', data: null, error: toError(error) }),
    });
  }, [loadWorkspace, request]);
  useEffect(() => {
    if (options.loadOnMount !== false) void reload();
    return request.invalidate;
  }, [options.loadOnMount, reload, request]);
  const updateProfile = useCallback((profile: ProfilePayload) => {
    setState((current) => updateData(current, { profile }));
  }, []);
  const addJob = useCallback((job: JobIntentPayload) => {
    setState((current) => updateData(current, { job }));
  }, []);
  return { state, reload, updateProfile, addJob };
}

export function createLatestWorkspaceRequest() {
  let latestSequence = 0;
  const invalidate = () => {
    latestSequence += 1;
  };
  const run = async <T>(handlers: LatestWorkspaceHandlers<T>): Promise<boolean> => {
    const sequence = ++latestSequence;
    try {
      const value = await handlers.load();
      if (sequence !== latestSequence) return false;
      handlers.onSuccess(value);
      return true;
    } catch (reason) {
      if (sequence !== latestSequence) return false;
      handlers.onError(reason);
      return false;
    }
  };
  return { invalidate, run };
}

export function createWorkspaceLoader(
  source: () => Promise<WorkspaceData> = loadWorkspaceData,
): () => Promise<WorkspaceData> {
  let request: Promise<WorkspaceData> | null = null;
  return () => {
    if (request) return request;
    const current = source();
    request = current;
    const release = () => {
      if (request === current) request = null;
    };
    void current.then(release, release);
    return current;
  };
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
