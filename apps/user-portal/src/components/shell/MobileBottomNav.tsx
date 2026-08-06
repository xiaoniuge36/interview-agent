'use client';

import Link from 'next/link';
import {
  Fragment,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationIcon } from './NavigationIcon';
import {
  navigationClickFromEvent,
  navigationAriaCurrent,
  navigationLinkClass,
  navigationPendingAnnouncement,
  navigationPendingReducer,
  navIdFromPathname,
  shouldStartNavigationPending,
  navItemById,
  type NavigationPendingAction,
  type NavigationId,
} from './navigation';
import { warmNavigationInteraction, warmNavigationRoutes } from './navigation-prefetch';

const MOBILE_NAVIGATION: NavigationId[] = [
  'home',
  'questions',
  'learn',
  'interview',
  'reports',
];
const MOBILE_PENDING_TIMEOUT_MS = 4000;
const MOBILE_PREFETCH_TIMEOUT_MS = 1200;
const MOBILE_PREFETCH_FALLBACK_DELAY_MS = 120;
const MOBILE_PENDING_STATUS_ID = 'mobile-navigation-pending-status';

export function MobileBottomNav({ agentTrigger }: { agentTrigger: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = navIdFromPathname(pathname);
  const [pending, dispatchPending] = useMobileNavigationPending(pathname);
  const warm = useMobileNavigationWarmup(pathname, router.prefetch);
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端主导航" aria-busy={pending !== null}>
      <MobileNavigationItems
        active={active}
        agentTrigger={agentTrigger}
        pathname={pathname}
        pending={pending}
        onNavigate={dispatchPending}
        onWarm={warm}
      />
    </nav>
  );
}

export function MobileNavigationItems(props: {
  active: NavigationId;
  agentTrigger: ReactNode;
  pathname: string;
  pending: NavigationId | null;
  onNavigate: (action: NavigationPendingAction) => void;
  onWarm: (href: string) => void;
}) {
  return (
    <>
      <span id={MOBILE_PENDING_STATUS_ID} className="sr-only" role="status">
        {navigationPendingAnnouncement(props.pending)}
      </span>
      {MOBILE_NAVIGATION.map((id) => {
        return (
          <Fragment key={id}>
            <MobileNavigationLink id={id} {...props} />
            {id === 'learn' ? props.agentTrigger : null}
          </Fragment>
        );
      })}
    </>
  );
}

function MobileNavigationLink(
  props: Omit<Parameters<typeof MobileNavigationItems>[0], 'agentTrigger'> & { id: NavigationId },
) {
  const item = navItemById(props.id);
  return (
    <Link
      className={navigationLinkClass(props.active, props.pending, props.id)}
      href={item.href}
      aria-current={navigationAriaCurrent(props.pathname, item.href, props.active === props.id)}
      aria-describedby={props.pending === props.id ? MOBILE_PENDING_STATUS_ID : undefined}
      data-navigation-pending={props.pending === props.id ? 'true' : undefined}
      onFocus={() => props.onWarm(item.href)}
      onPointerDown={(event) =>
        warmMobileNavigation({
          event,
          pathname: props.pathname,
          target: props.id,
          onWarm: props.onWarm,
          href: item.href,
        })
      }
      onClick={(event) =>
        trackMobileNavigation({
          event,
          pathname: props.pathname,
          target: props.id,
          dispatchPending: props.onNavigate,
        })
      }
    >
      <NavigationIcon name={item.icon} />
      <span>{mobileLabel(props.id)}</span>
    </Link>
  );
}

function useMobileNavigationPending(pathname: string) {
  const [pending, dispatchPending] = useReducer(navigationPendingReducer, null);
  useEffect(() => dispatchPending({ type: 'clear' }), [pathname]);
  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(
      () => dispatchPending({ type: 'clear' }),
      MOBILE_PENDING_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [pending]);
  return [pending, dispatchPending] as const;
}

function useMobileNavigationWarmup(pathname: string, prefetch: (href: string) => void) {
  const prefetched = useRef(new Set<string>());
  useEffect(() => {
    const controller = new AbortController();
    const warmRoutes = () =>
      warmNavigationRoutes({
        pathname,
        targets: MOBILE_NAVIGATION.map(navItemById),
        prefetched: prefetched.current,
        prefetch,
        signal: controller.signal,
      });
    const requestIdle = window.requestIdleCallback;
    if (requestIdle) {
      const idleId = requestIdle(() => void warmRoutes(), { timeout: MOBILE_PREFETCH_TIMEOUT_MS });
      return () => {
        window.cancelIdleCallback(idleId);
        controller.abort();
      };
    }
    const timeoutId = window.setTimeout(() => void warmRoutes(), MOBILE_PREFETCH_FALLBACK_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pathname, prefetch]);
  return useCallback(
    (href: string) =>
      warmNavigationInteraction({ href, pathname, prefetched: prefetched.current, prefetch }),
    [pathname, prefetch],
  );
}

function trackMobileNavigation(options: {
  event: MouseEvent<HTMLAnchorElement>;
  pathname: string;
  target: NavigationId;
  dispatchPending: (action: NavigationPendingAction) => void;
}) {
  options.dispatchPending({
    type: 'navigate',
    click: navigationClickFromEvent(options.event, options.target, options.pathname),
  });
}

function warmMobileNavigation(options: {
  event: PointerEvent<HTMLAnchorElement>;
  pathname: string;
  target: NavigationId;
  href: string;
  onWarm: (href: string) => void;
}) {
  const click = navigationClickFromEvent(options.event, options.target, options.pathname);
  if (shouldStartNavigationPending(click)) options.onWarm(options.href);
}

function mobileLabel(id: NavigationId) {
  if (id === 'questions') return '刷题';
  if (id === 'learn') return '学习';
  if (id === 'interview') return '模拟';
  if (id === 'reports') return '复盘';
  return '首页';
}
