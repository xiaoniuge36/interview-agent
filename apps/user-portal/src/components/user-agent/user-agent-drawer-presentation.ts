import { useSyncExternalStore } from 'react';

const COMPACT_QUERY = '(max-width: 720px)';

export function resolveUserAgentDrawerPresentation(isCompact: boolean) {
  return { ariaModal: isCompact || undefined };
}

export function useCompactUserAgentDrawer() {
  return useSyncExternalStore(subscribeToViewport, readViewportMatch, () => false);
}

function subscribeToViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(COMPACT_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function readViewportMatch() {
  return window.matchMedia(COMPACT_QUERY).matches;
}
