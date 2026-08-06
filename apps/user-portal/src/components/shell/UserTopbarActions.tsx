'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@interview-agent/auth-client';
import { runSessionSignOut } from '@/components/auth/session-sign-out';
import { ThemeMenu } from '../theme/ThemeMenu';
import { sidebarAccountActions } from './sidebar-account-actions';

export function UserTopbarActions() {
  const auth = useAuth();
  const pathname = usePathname();
  const name = auth.identity?.displayName ?? '训练用户';
  const showSignOut = sidebarAccountActions(auth.mode).includes('sign_out');
  const profileCurrent = currentDestination(pathname, '/profile', ['/job']);
  const settingsCurrent = currentDestination(pathname, '/settings');

  return (
    <div className="user-topbar-actions" aria-label="账号操作">
      <ThemeMenu variant="topbar" />
      <Link
        className={`user-topbar-account${profileCurrent ? ' active' : ''}`}
        href="/profile"
        aria-label="打开个人档案"
        aria-current={profileCurrent}
      >
        <span className="user-topbar-avatar">{initial(name)}</span>
        <span>
          <strong>{name}</strong>
          <small>Agent 档案</small>
        </span>
      </Link>
      <Link
        className={`user-topbar-settings${settingsCurrent ? ' active' : ''}`}
        href="/settings"
        aria-label="打开设置"
        aria-current={settingsCurrent}
      >
        <SettingsIcon />
        <span>设置</span>
      </Link>
      {showSignOut ? (
        <button
          className="user-topbar-signout"
          type="button"
          onClick={() => void runSessionSignOut(() => auth.signOut())}
        >
          <LogoutIcon />
          <span>退出登录</span>
        </button>
      ) : null}
    </div>
  );
}

function currentDestination(
  pathname: string,
  href: string,
  aliases: readonly string[] = [],
): 'page' | 'location' | undefined {
  if (pathname === href) return 'page';
  const destinations = [href, ...aliases];
  return destinations.some(
    (destination) => pathname === destination || pathname.startsWith(`${destination}/`),
  )
    ? 'location'
    : undefined;
}

function initial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || 'U';
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z" />
      <path d="M19 13.6V10.4L16.9 9.5 16.6 8.8 17.5 6.7 15.3 4.5 13.2 5.4 12.5 5.1 11.6 3H8.4L7.5 5.1 6.8 5.4 4.7 4.5 2.5 6.7 3.4 8.8 3.1 9.5 1 10.4V13.6L3.1 14.5 3.4 15.2 2.5 17.3 4.7 19.5 6.8 18.6 7.5 18.9 8.4 21H11.6L12.5 18.9 13.2 18.6 15.3 19.5 17.5 17.3 16.6 15.2 16.9 14.5 19 13.6Z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10M14 8l4 4-4 4M18 12H9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
