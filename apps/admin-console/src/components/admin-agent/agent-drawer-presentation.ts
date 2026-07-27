import { useSyncExternalStore } from 'react';

const COMPACT_QUERY = '(max-width: 720px)';

type RootWithDataset = {
  dataset: Record<string, string | undefined>;
};

export function resolveAgentDrawerPresentation(isCompact: boolean) {
  return isCompact ? { mask: true, maskClosable: true } : { mask: false, maskClosable: false };
}

export function useCompactAgentDrawer() {
  return useSyncExternalStore(subscribeToViewport, readViewportMatch, () => false);
}

export function syncAdminAgentDrawerPresence(root: RootWithDataset, open: boolean) {
  if (open) root.dataset.adminAgentDrawerOpen = 'true';
  else delete root.dataset.adminAgentDrawerOpen;
  return () => {
    delete root.dataset.adminAgentDrawerOpen;
  };
}

function subscribeToViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(COMPACT_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function readViewportMatch() {
  return window.matchMedia(COMPACT_QUERY).matches;
}
