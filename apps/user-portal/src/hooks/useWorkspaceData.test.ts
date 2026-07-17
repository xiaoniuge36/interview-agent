import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceData } from '../lib/workspace-api';
import { createWorkspaceLoader } from './useWorkspaceData';

describe('workspace request coordination', () => {
  it('shares one in-flight workspace request and allows a later refresh', async () => {
    const data = {} as WorkspaceData;
    let release: ((value: WorkspaceData) => void) | undefined;
    const source = vi.fn(
      () =>
        new Promise<WorkspaceData>((resolve) => {
          release = resolve;
        }),
    );
    const load = createWorkspaceLoader(source);

    const first = load();
    const second = load();
    expect(source).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    release?.(data);
    await expect(first).resolves.toBe(data);
    void load();
    expect(source).toHaveBeenCalledTimes(2);
  });
});
