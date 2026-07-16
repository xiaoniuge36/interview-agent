'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavigationIcon } from './NavigationIcon';
import { navIdFromPathname, navItemById, type NavigationId } from './navigation';

const MOBILE_NAVIGATION: NavigationId[] = ['home', 'questions', 'profile', 'interview', 'reports'];

export function MobileBottomNav() {
  const active = navIdFromPathname(usePathname());
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端主导航">
      {MOBILE_NAVIGATION.map((id) => {
        const item = navItemById(id);
        return (
          <Link key={id} className={active === id ? 'active' : ''} href={item.href} aria-current={active === id ? 'page' : undefined}>
            <NavigationIcon name={item.icon} />
            <span>{mobileLabel(id)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function mobileLabel(id: NavigationId) {
  if (id === 'questions') return '刷题';
  if (id === 'profile') return 'Agent';
  if (id === 'interview') return '模拟';
  if (id === 'reports') return '复盘';
  return '首页';
}
