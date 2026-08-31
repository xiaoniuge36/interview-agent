import { useSyncExternalStore } from 'react';

const COMPACT_QUERY = '(max-width: 720px)';

/**
 * 桌面端抽屉是"非模态侧栏"（页面其余部分保持可交互，backdrop 隐藏），
 * 因此刻意不 trapFocus 也不设 aria-modal；移动端全屏遮盖才按模态处理。
 */
export function resolveUserAgentDrawerPresentation(isCompact: boolean) {
  return {
    ariaModal: isCompact || undefined,
    initialFocus: 'composer' as const,
    trapFocus: isCompact,
  };
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
