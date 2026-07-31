import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MobileNavigationItems } from './MobileBottomNav';
import { SidebarNavigation } from './UserSidebar';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('optimistic navigation feedback', () => {
  it('keeps the committed sidebar tab current while immediately exposing the pending destination', () => {
    const markup = renderToStaticMarkup(
      <SidebarNavigation
        active="home"
        pending="reports"
        pendingAnnouncement="正在打开复盘中心…"
        onNavigate={vi.fn()}
        onWarm={vi.fn()}
      />,
    );

    expect(anchorFor(markup, '/home')).toContain('aria-current="page"');
    expect(anchorFor(markup, '/reports')).toContain('class="active pending"');
    expect(anchorFor(markup, '/reports')).toContain('data-navigation-pending="true"');
    expect(anchorFor(markup, '/reports')).toContain(
      'aria-describedby="sidebar-navigation-pending-status"',
    );
    expect(markup).toContain('role="status"');
    expect(markup).toContain('正在打开复盘中心…');
    expect(anchorFor(markup, '/reports')).not.toContain('aria-current');
  });

  it('gives the mobile destination the same pending feedback without claiming route completion', () => {
    const markup = renderToStaticMarkup(
      <MobileNavigationItems
        active="home"
        pending="reports"
        onNavigate={vi.fn()}
        onWarm={vi.fn()}
      />,
    );

    expect(anchorFor(markup, '/home')).toContain('aria-current="page"');
    expect(anchorFor(markup, '/reports')).toContain('class="active pending"');
    expect(anchorFor(markup, '/reports')).toContain('data-navigation-pending="true"');
    expect(anchorFor(markup, '/reports')).toContain(
      'aria-describedby="mobile-navigation-pending-status"',
    );
    expect(markup).toContain('role="status"');
    expect(markup).toContain('正在打开复盘中心…');
    expect(anchorFor(markup, '/reports')).not.toContain('aria-current');
  });
});

function anchorFor(markup: string, href: string) {
  const match = markup.match(new RegExp(`<a(?=[^>]*href="${href}")[^>]*>`));
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}
