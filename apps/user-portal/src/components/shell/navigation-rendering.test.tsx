import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MobileNavigationItems } from './MobileBottomNav';
import { SidebarNavigation } from './UserSidebar';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('consumer desktop navigation', () => {
  it('keeps the desktop header focused on consumer journeys', () => {
    const markup = renderToStaticMarkup(
      <SidebarNavigation
        active="home"
        pathname="/home"
        pending={null}
        pendingAnnouncement=""
        onNavigate={vi.fn()}
        onWarm={vi.fn()}
      />,
    );

    expect(markup).toContain('今天');
    expect(markup).toContain('刷题');
    expect(markup).toContain('模拟面试');
    expect(markup).toContain('成长');
    expect(markup).not.toContain('href="/profile"');
    expect(markup).not.toContain('href="/practice"');
    expect(markup).not.toContain('href="/settings"');
  });
});

describe('optimistic navigation feedback', () => {
  it('keeps the committed sidebar tab current while immediately exposing the pending destination', () => {
    const markup = renderToStaticMarkup(
      <SidebarNavigation
        active="home"
        pathname="/home"
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
        agentTrigger={<button aria-label="打开 AI 刷题教练">教练</button>}
        pathname="/home"
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

describe('mobile navigation semantics', () => {
  it('renders the AI coach as the real fourth control', () => {
    const markup = renderToStaticMarkup(
      <MobileNavigationItems
        active="home"
        agentTrigger={<button aria-label="打开 AI 刷题教练">教练</button>}
        pathname="/home"
        pending={null}
        onNavigate={vi.fn()}
        onWarm={vi.fn()}
      />,
    );

    const learnIndex = markup.indexOf('href="/learn"');
    const coachIndex = markup.indexOf('aria-label="打开 AI 刷题教练"');
    const interviewIndex = markup.indexOf('href="/interview"');

    expect(markup).not.toContain('href="/profile"');
    expect(coachIndex).toBeGreaterThan(learnIndex);
    expect(coachIndex).toBeLessThan(interviewIndex);
  });
});

function anchorFor(markup: string, href: string) {
  const match = markup.match(new RegExp(`<a(?=[^>]*href="${href}")[^>]*>`));
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}
