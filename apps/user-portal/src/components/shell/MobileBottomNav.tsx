'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationIcon } from './NavigationIcon';
import {
  navigationClickFromEvent,
  navigationLinkClass,
  navigationPendingAnnouncement,
  navigationPendingReducer,
  navIdFromPathname,
  shouldStartNavigationPending,
  navItemById,
  type NavigationPendingAction,
  type NavigationId,
} from './navigation';
import {
  warmDevelopmentRoute,
  warmNavigationInteraction,
  warmNavigationRoutes,
} from './navigation-prefetch';

const MOBILE_NAVIGATION: NavigationId[] = [
  'home',
  'questions',
  'learn',
  'profile',
  'interview',
  'reports',
];
const MOBILE_PENDING_TIMEOUT_MS = 4000;
const MOBILE_PREFETCH_TIMEOUT_MS = 1200;
const MOBILE_PREFETCH_FALLBACK_DELAY_MS = 120;
const MOBILE_PENDING_STATUS_ID = 'mobile-navigation-pending-status';
const SHOULD_WARM_DEVELOPMENT_ROUTES = process.env.NODE_ENV === 'development';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const active = navIdFromPathname(pathname);
  const [pending, dispatchPending] = useMobileNavigationPending(pathname);
  const warm = useMobileNavigationWarmup(pathname, router.prefetch);
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端主导航" aria-busy={pending !== null}>
      <MobileNavigationItems
        active={active}
        pending={pending}
        onNavigate={dispatchPending}
        onWarm={warm}
      />
    </nav>
  );
}

export function MobileNavigationItems(props: {
  active: NavigationId;
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
        const item = navItemById(id);
        return (
          <Link
            key={id}
            className={navigationLinkClass(props.active, props.pending, id)}
            href={item.href}
            aria-current={props.active === id ? 'page' : undefined}
            aria-describedby={props.pending === id ? MOBILE_PENDING_STATUS_ID : undefined}
            data-navigation-pending={props.pending === id ? 'true' : undefined}
            onFocus={() => props.onWarm(item.href)}
            onPointerDown={(event) =>
              warmMobileNavigation({
                event,
                active: props.active,
                target: id,
                onWarm: props.onWarm,
                href: item.href,
              })
            }
            onClick={(event) =>
              trackMobileNavigation({
                event,
                active: props.active,
                target: id,
                dispatchPending: props.onNavigate,
              })
            }
          >
            <NavigationIcon name={item.icon} />
            <span>{mobileLabel(id)}</span>
          </Link>
        );
      })}
    </>
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
        ...(SHOULD_WARM_DEVELOPMENT_ROUTES ? { warmDevelopmentRoute } : {}),
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
  active: NavigationId;
  target: NavigationId;
  dispatchPending: (action: NavigationPendingAction) => void;
}) {
  options.dispatchPending({
    type: 'navigate',
    click: navigationClickFromEvent(options.event, options.active, options.target),
  });
}

function warmMobileNavigation(options: {
  event: PointerEvent<HTMLAnchorElement>;
  active: NavigationId;
  target: NavigationId;
  href: string;
  onWarm: (href: string) => void;
}) {
  const click = navigationClickFromEvent(options.event, options.active, options.target);
  if (shouldStartNavigationPending(click)) options.onWarm(options.href);
}

function mobileLabel(id: NavigationId) {
  if (id === 'questions') return '刷题';
  if (id === 'learn') return '学习';
  if (id === 'profile') return 'Agent';
  if (id === 'interview') return '模拟';
  if (id === 'reports') return '复盘';
  return '首页';
}
