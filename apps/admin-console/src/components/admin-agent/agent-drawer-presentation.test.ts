import { describe, expect, it } from 'vitest';
import {
  resolveAgentDrawerPresentation,
  syncAdminAgentDrawerPresence,
} from './agent-drawer-presentation';

describe('resolveAgentDrawerPresentation', () => {
  it('keeps the desktop agent panel non-modal so the workspace remains interactive', () => {
    expect(resolveAgentDrawerPresentation(false)).toEqual({ mask: false, maskClosable: false });
  });

  it('keeps the compact agent panel modal to prevent accidental background actions', () => {
    expect(resolveAgentDrawerPresentation(true)).toEqual({ mask: true, maskClosable: true });
  });
});

describe('syncAdminAgentDrawerPresence', () => {
  it('marks the root while the drawer is open and cleans it up afterwards', () => {
    const root = { dataset: {} as Record<string, string | undefined> };

    const cleanup = syncAdminAgentDrawerPresence(root, true);

    expect(root.dataset.adminAgentDrawerOpen).toBe('true');
    cleanup();
    expect(root.dataset.adminAgentDrawerOpen).toBeUndefined();
  });

  it('removes a stale marker when the drawer is closed', () => {
    const root = { dataset: { adminAgentDrawerOpen: 'true' } };

    syncAdminAgentDrawerPresence(root, false);

    expect(root.dataset.adminAgentDrawerOpen).toBeUndefined();
  });
});
