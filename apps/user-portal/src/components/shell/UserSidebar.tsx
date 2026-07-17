'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@interview-agent/auth-client';
import { NavigationIcon } from './NavigationIcon';
import {
  NAV_ITEMS,
  navigationLinkClass,
  navIdFromPathname,
  type NavigationId,
} from './navigation';
import { sidebarAccountActions } from './sidebar-account-actions';
import { ThemeMenu } from '../theme/ThemeMenu';

const NAV_PENDING_TIMEOUT_MS = 4000;

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const active = navIdFromPathname(pathname);
  const [pending, setPending] = useState<NavigationId | null>(null);
  const name = auth.identity?.displayName ?? '训练用户';
  const accountActions = sidebarAccountActions(auth.mode);
  useEffect(() => setPending(null), [pathname]);
  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(null), NAV_PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [pending]);
  return (
    <aside className="user-sidebar" aria-label="主导航">
      <SidebarBrand />
      <SidebarUserSummary name={name} />
      <SidebarNavigation
        active={active}
        pending={pending}
        onNavigate={setPending}
        onWarm={router.prefetch}
      />
      <ThemeMenu variant="sidebar" />
      <SidebarAccount
        name={name}
        showSignOut={accountActions.includes('sign_out')}
        onSignOut={() => void auth.signOut()}
      />
    </aside>
  );
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

function SidebarUserSummary({ name }: { name: string }) {
  return (
    <Link className="sidebar-user-summary" href="/settings" aria-label="打开个人设置">
      <span className="sidebar-avatar">{initial(name)}</span>
      <span>
        <strong>{name}</strong>
        <small>求职者</small>
      </span>
      <span className="sidebar-chevron" aria-hidden="true">
        ⌄
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

function SidebarAccount({
  name,
  showSignOut,
  onSignOut,
}: {
  name: string;
  showSignOut: boolean;
  onSignOut: () => void;
}) {
  return (
    <div className={showSignOut ? 'sidebar-account has-signout' : 'sidebar-account'}>
      <Link className="sidebar-account-link" href="/settings">
        <span className="sidebar-avatar">{initial(name)}</span>
        <span>
          <strong>{name}</strong>
          <small>个人设置</small>
        </span>
        <span className="sidebar-chevron" aria-hidden="true">
          ›
        </span>
      </Link>
      {showSignOut ? (
        <button className="sidebar-signout" type="button" onClick={onSignOut}>
          <LogoutIcon />
          <span>退出登录</span>
        </button>
      ) : null}
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10M14 8l4 4-4 4M18 12H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function initial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || 'U';
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" focusable="false">
      <path d="M5 14.5 26.5 5.2 18 27l-4.1-9.1L5 14.5Z" fill="currentColor" />
      <path
        d="m14 17.9 12.5-12.7"
        fill="none"
        stroke="#BBD3FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
