'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@interview-agent/auth-client';
import { NavigationIcon } from './NavigationIcon';
import { NAV_ITEMS, navIdFromPathname } from './navigation';
import { sidebarAccountActions } from './sidebar-account-actions';
import { ThemeMenu } from '../theme/ThemeMenu';

export function UserSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const name = auth.identity?.displayName ?? '训练用户';
  const accountActions = sidebarAccountActions(auth.mode);
  return (
    <aside className="user-sidebar" aria-label="主导航">
      <SidebarBrand />
      <SidebarUserSummary name={name} />
      <SidebarNavigation active={navIdFromPathname(pathname)} />
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

function SidebarNavigation({ active }: { active: ReturnType<typeof navIdFromPathname> }) {
  return (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          className={active === item.id ? 'active' : ''}
          href={item.href}
          aria-current={active === item.id ? 'page' : undefined}
        >
          <NavigationIcon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
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
