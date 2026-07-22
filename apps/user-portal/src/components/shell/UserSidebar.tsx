'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationIcon } from './NavigationIcon';
import { NAV_ITEMS, navigationLinkClass, navIdFromPathname, type NavigationId } from './navigation';

const NAV_PENDING_TIMEOUT_MS = 4000;
const NAV_PREFETCH_TIMEOUT_MS = 1200;
const NAV_PREFETCH_FALLBACK_DELAY_MS = 120;
const SHOULD_WARM_DEVELOPMENT_ROUTES = process.env.NODE_ENV === 'development';

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const active = navIdFromPathname(pathname);
  const [pending, setPending] = useState<NavigationId | null>(null);
  useNavigationWarmup(pathname, router.prefetch);
  useEffect(() => setPending(null), [pathname]);
  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(null), NAV_PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return (
    <aside className="user-sidebar" aria-label="主导航">
      <SidebarBrand />
      <SidebarNavigation
        active={active}
        pending={pending}
        onNavigate={setPending}
        onWarm={router.prefetch}
      />
    </aside>
  );
}

function useNavigationWarmup(pathname: string, prefetch: (href: string) => void) {
  const prefetched = useRef(new Set<string>());
  useEffect(() => {
    const warmRoutes = async () => {
      for (const item of NAV_ITEMS) {
        if (item.href === pathname || prefetched.current.has(item.href)) continue;
        prefetched.current.add(item.href);
        prefetch(item.href);
        if (SHOULD_WARM_DEVELOPMENT_ROUTES) await warmDevelopmentRoute(item.href);
      }
    };
    const requestIdle = window.requestIdleCallback;
    if (requestIdle) {
      const idleId = requestIdle(() => void warmRoutes(), { timeout: NAV_PREFETCH_TIMEOUT_MS });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(() => void warmRoutes(), NAV_PREFETCH_FALLBACK_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [pathname, prefetch]);
}

async function warmDevelopmentRoute(href: string) {
  try {
    await fetch(href, { credentials: 'same-origin' });
  } catch {
    return;
  }
}

function SidebarBrand() {
  return (
    <Link className="sidebar-brand" href="/home">
      <span className="sidebar-mark" aria-hidden="true">
        <BrandMark />
      </span>
      <span>
        <strong>OfferPilot</strong>
        <small>你的面试 Agent</small>
      </span>
    </Link>
  );
}

function SidebarNavigation(props: {
  active: NavigationId;
  pending: NavigationId | null;
  onNavigate: (id: NavigationId) => void;
  onWarm: (href: string) => void;
}) {
  return (
    <nav className="sidebar-nav" aria-busy={props.pending !== null}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          className={navigationLinkClass(props.active, props.pending, item.id)}
          href={item.href}
          aria-current={props.active === item.id ? 'page' : undefined}
          onMouseEnter={() => props.onWarm(item.href)}
          onFocus={() => props.onWarm(item.href)}
          onClick={(event) =>
            trackNavigation({
              event,
              active: props.active,
              target: item.id,
              onNavigate: props.onNavigate,
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

function trackNavigation(options: {
  event: MouseEvent<HTMLAnchorElement>;
  active: NavigationId;
  target: NavigationId;
  onNavigate: (id: NavigationId) => void;
}) {
  const { event, active, target, onNavigate } = options;
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    active === target
  )
    return;
  onNavigate(target);
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" focusable="false">
      <path d="M5 14.5 26.5 5.2 18 27l-4.1-9.1L5 14.5Z" fill="currentColor" />
      <path
        d="m14 17.9 12.5-12.7"
        fill="none"
        stroke="#BBD3FF"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
