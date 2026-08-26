import { useEffect, useRef, useState } from 'react';

const IDLE_PROBE_TIMEOUT_MS = 3_000;

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * 浮窗未挂载时的轻量恢复探测：延后到浏览器空闲（requestIdleCallback，
 * 无支持时用 setTimeout 兜底）执行一次 probe，返回是否存在进行中的 run。
 * probe 失败静默忽略——首次打开浮窗时会执行完整 bootstrap。
 */
export function usePageAgentActiveRunProbe(enabled: boolean, probe: () => Promise<boolean>) {
  const [hasActiveRun, setHasActiveRun] = useState(false);
  const probeRef = useRef(probe);
  probeRef.current = probe;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const runProbe = () => {
      probeRef
        .current()
        .then((active) => {
          if (!cancelled && active) setHasActiveRun(true);
        })
        .catch(() => undefined);
    };
    const idleWindow = window as IdleCapableWindow;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(runProbe, {
        timeout: IDLE_PROBE_TIMEOUT_MS,
      });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(handle);
      };
    }
    const timer = window.setTimeout(runProbe, IDLE_PROBE_TIMEOUT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);
  return hasActiveRun;
}
