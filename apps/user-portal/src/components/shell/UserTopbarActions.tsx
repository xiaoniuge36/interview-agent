'use client';

import Link from 'next/link';
import { useAuth } from '@interview-agent/auth-client';
import { ThemeMenu } from '../theme/ThemeMenu';
import { sidebarAccountActions } from './sidebar-account-actions';

export function UserTopbarActions() {
  const auth = useAuth();
  const name = auth.identity?.displayName ?? '训练用户';
  const showSignOut = sidebarAccountActions(auth.mode).includes('sign_out');

  return (
    <div className="user-topbar-actions" aria-label="账号操作">
      <ThemeMenu variant="topbar" />
      <Link className="user-topbar-account" href="/settings" aria-label="打开个人设置">
        <span className="user-topbar-avatar">{initial(name)}</span>
        <span>
          <strong>{name}</strong>
          <small>个人设置</small>
        </span>
      </Link>
      {showSignOut ? (
        <button className="user-topbar-signout" type="button" onClick={() => void auth.signOut()}>
          <LogoutIcon />
          <span>退出登录</span>
        </button>
      ) : null}
    </div>
  );
}

function initial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || 'U';
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
