'use client';

import Link from 'next/link';
import { useEffect, useReducer, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  NAV_ITEMS,
  navigationAriaCurrent,
  navigationClickFromEvent,
  navigationLinkClass,
  navigationPendingAnnouncement,
  navigationPendingReducer,
  navIdFromPathname,
  type NavigationPendingAction,
  type NavigationId,
} from './navigation';
import { warmNavigationRoutes } from './navigation-prefetch';

// dev 首次进入某路由要现场编译，4s 内 pending 被清会造成“没点上”的错觉，放宽到 8s。
const NAV_PENDING_TIMEOUT_MS = 8000;
const NAV_PREFETCH_TIMEOUT_MS = 1200;
const NAV_PREFETCH_FALLBACK_DELAY_MS = 120;
const SIDEBAR_PENDING_STATUS_ID = 'sidebar-navigation-pending-status';
const PRIMARY_NAVIGATION: NavigationId[] = ['home', 'questions', 'learn', 'interview', 'reports'];
const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter((item) => PRIMARY_NAVIGATION.includes(item.id));

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
    <div className="user-sidebar">
      <SidebarBrand />
      <SidebarNavigation
        active={active}
        pathname={pathname}
        pending={pending}
        pendingAnnouncement={navigationPendingAnnouncement(pending)}
        onNavigate={dispatchPending}
        onWarm={router.prefetch}
      />
    </div>
  );
}

function useNavigationWarmup(pathname: string, prefetch: (href: string) => void) {
  const prefetched = useRef(new Set<string>());
  useEffect(() => {
    const controller = new AbortController();
    const warmRoutes = () =>
      warmNavigationRoutes({
        pathname,
        targets: PRIMARY_NAV_ITEMS,
        prefetched: prefetched.current,
        prefetch,
        signal: controller.signal,
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
    <Link className="sidebar-brand" href="/home" aria-label="Interview Agent 首页">
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
  pathname: string;
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
      {PRIMARY_NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          className={navigationLinkClass(props.active, props.pending, item.id)}
          href={item.href}
          aria-current={navigationAriaCurrent(props.pathname, item.href, props.active === item.id)}
          aria-describedby={props.pending === item.id ? SIDEBAR_PENDING_STATUS_ID : undefined}
          data-navigation-pending={props.pending === item.id ? 'true' : undefined}
          onMouseEnter={() => props.onWarm(item.href)}
          onFocus={() => props.onWarm(item.href)}
          onClick={(event) =>
            props.onNavigate({
              type: 'navigate',
              click: navigationClickFromEvent(event, item.id, props.pathname),
            })
          }
        >
          <span>{primaryNavigationLabel(item.id)}</span>
        </Link>
      ))}
    </nav>
  );
}

function primaryNavigationLabel(id: NavigationId): string {
  if (id === 'home') return '今天';
  if (id === 'questions') return '刷题';
  if (id === 'interview') return '模拟面试';
  if (id === 'reports') return '成长';
  return '学习';
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" focusable="false">
      <path d="M9 9.5v13M9 9.5h5M9 22.5h5M17 22.5l4.5-13 4.5 13" />
      <path className="brand-mark-signal" d="M18.6 18h5.8" />
    </svg>
  );
}
