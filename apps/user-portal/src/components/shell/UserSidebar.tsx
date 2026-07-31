'use client';

import Link from 'next/link';
import { useEffect, useReducer, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationIcon } from './NavigationIcon';
import {
  NAV_ITEMS,
  navigationClickFromEvent,
  navigationLinkClass,
  navigationPendingAnnouncement,
  navigationPendingReducer,
  navIdFromPathname,
  type NavigationPendingAction,
  type NavigationId,
} from './navigation';
import { warmDevelopmentRoute, warmNavigationRoutes } from './navigation-prefetch';

const NAV_PENDING_TIMEOUT_MS = 4000;
const NAV_PREFETCH_TIMEOUT_MS = 1200;
const NAV_PREFETCH_FALLBACK_DELAY_MS = 120;
const SHOULD_WARM_DEVELOPMENT_ROUTES = process.env.NODE_ENV === 'development';
const SIDEBAR_PENDING_STATUS_ID = 'sidebar-navigation-pending-status';

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const active = navIdFromPathname(pathname);
  const [pending, dispatchPending] = useReducer(navigationPendingReducer, null);
  useNavigationWarmup(pathname, router.prefetch);
  useEffect(() => dispatchPending({ type: 'clear' }), [pathname]);
  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(
      () => dispatchPending({ type: 'clear' }),
      NAV_PENDING_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return (
    <aside className="user-sidebar" aria-label="主导航">
      <SidebarBrand />
      <SidebarNavigation
        active={active}
        pending={pending}
        pendingAnnouncement={navigationPendingAnnouncement(pending)}
        onNavigate={dispatchPending}
        onWarm={router.prefetch}
      />
    </aside>
  );
}

function useNavigationWarmup(pathname: string, prefetch: (href: string) => void) {
  const prefetched = useRef(new Set<string>());
  useEffect(() => {
    const controller = new AbortController();
    const warmRoutes = () =>
      warmNavigationRoutes({
        pathname,
        targets: NAV_ITEMS,
        prefetched: prefetched.current,
        prefetch,
        signal: controller.signal,
        ...(SHOULD_WARM_DEVELOPMENT_ROUTES ? { warmDevelopmentRoute } : {}),
      });
    const requestIdle = window.requestIdleCallback;
    if (requestIdle) {
      const idleId = requestIdle(() => void warmRoutes(), { timeout: NAV_PREFETCH_TIMEOUT_MS });
      return () => {
        window.cancelIdleCallback(idleId);
        controller.abort();
      };
    }
    const timeoutId = window.setTimeout(() => void warmRoutes(), NAV_PREFETCH_FALLBACK_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pathname, prefetch]);
}

function SidebarBrand() {
  return (
    <Link className="sidebar-brand" href="/home">
      <span className="sidebar-mark" aria-hidden="true">
        <BrandMark />
      </span>
      <span className="sidebar-brand-copy">
        <strong>
          <span>Interview</span>
          <span className="sidebar-brand-agent">Agent</span>
        </strong>
        <small>
          <span className="sidebar-brand-signal" aria-hidden="true" />
          AI 面试训练伙伴
        </small>
      </span>
    </Link>
  );
}

export function SidebarNavigation(props: {
  active: NavigationId;
  pending: NavigationId | null;
  pendingAnnouncement: string;
  onNavigate: (action: NavigationPendingAction) => void;
  onWarm: (href: string) => void;
}) {
  return (
    <nav className="sidebar-nav" aria-busy={props.pending !== null}>
      <span id={SIDEBAR_PENDING_STATUS_ID} className="sr-only" role="status">
        {props.pendingAnnouncement}
      </span>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          className={navigationLinkClass(props.active, props.pending, item.id)}
          href={item.href}
          aria-current={props.active === item.id ? 'page' : undefined}
          aria-describedby={props.pending === item.id ? SIDEBAR_PENDING_STATUS_ID : undefined}
          data-navigation-pending={props.pending === item.id ? 'true' : undefined}
          onMouseEnter={() => props.onWarm(item.href)}
          onFocus={() => props.onWarm(item.href)}
          onClick={(event) =>
            props.onNavigate({
              type: 'navigate',
              click: navigationClickFromEvent(event, props.active, item.id),
            })
          }
        >
          <NavigationIcon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" focusable="false">
      <path
        d="M8.25 9.5h5.2M10.85 9.5v13M8.25 22.5h5.2M15.8 22.5l4.7-13 4.7 13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
      <path d="M17.5 18h6" fill="none" stroke="#65E1C2" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
