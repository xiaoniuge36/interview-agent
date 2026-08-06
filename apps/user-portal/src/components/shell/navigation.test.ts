import { expect, it } from 'vitest';
import {
  NAV_ITEMS,
  navigationPendingReducer,
  navigationPendingAnnouncement,
  navigationLinkClass,
  navigationAriaCurrent,
  navIdFromPathname,
  shouldStartNavigationPending,
} from './navigation';

it('sidebar navigation moves the active visual state to the destination immediately after a click', () => {
  expect(navigationLinkClass('home', 'profile', 'profile')).toBe('active pending');
  expect(navigationLinkClass('home', 'profile', 'home')).toBe('');
  expect(navigationLinkClass('profile', null, 'profile')).toBe('active');
});

it('sidebar navigation exposes the learning center and keeps it active for nested routes', () => {
  expect(NAV_ITEMS).toContainEqual(
    expect.objectContaining({ id: 'learn', href: '/learn', label: '学习' }),
  );
  expect(navIdFromPathname('/learn')).toBe('learn');
  expect(navIdFromPathname('/learn/agent-basics')).toBe('learn');
});

it('keeps the practice flow under the questions navigation tab', () => {
  expect(navIdFromPathname('/practice')).toBe('questions');
  expect(navIdFromPathname('/practice/session-1')).toBe('questions');
  expect(navigationAriaCurrent('/practice', '/questions', true)).toBe('location');
  expect(navigationAriaCurrent('/questions', '/questions', true)).toBe('page');
});

it('sidebar navigation announces an optimistic destination without pretending the route has committed', () => {
  expect(navigationPendingAnnouncement('reports')).toBe('正在打开复盘中心…');
  expect(navigationPendingAnnouncement(null)).toBe('');
});

it('sidebar navigation only marks unmodified primary clicks to a different route as pending', () => {
  const click = {
    target: 'reports' as const,
    currentPathname: '/home',
    defaultPrevented: false,
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  };

  expect(shouldStartNavigationPending(click)).toBe(true);
  expect(shouldStartNavigationPending({ ...click, target: 'home' })).toBe(false);
  expect(shouldStartNavigationPending({ ...click, ctrlKey: true })).toBe(false);
  expect(shouldStartNavigationPending({ ...click, metaKey: true })).toBe(false);
  expect(shouldStartNavigationPending({ ...click, shiftKey: true })).toBe(false);
  expect(shouldStartNavigationPending({ ...click, altKey: true })).toBe(false);
  expect(shouldStartNavigationPending({ ...click, button: 2 })).toBe(false);
  expect(shouldStartNavigationPending({ ...click, defaultPrevented: true })).toBe(false);
  expect(
    shouldStartNavigationPending({
      ...click,
      currentPathname: '/practice',
      target: 'questions',
    }),
  ).toBe(true);
});

it('sidebar navigation uses the last primary destination and clears on same-route, route commit, or timeout', () => {
  const first = {
    target: 'questions' as const,
    currentPathname: '/home',
    defaultPrevented: false,
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  };
  const second = { ...first, target: 'reports' as const };

  expect(navigationPendingReducer(null, { type: 'navigate', click: first })).toBe('questions');
  expect(navigationPendingReducer('questions', { type: 'navigate', click: second })).toBe(
    'reports',
  );
  expect(
    navigationPendingReducer('reports', { type: 'navigate', click: { ...first, target: 'home' } }),
  ).toBeNull();
  expect(navigationPendingReducer('reports', { type: 'clear' })).toBeNull();
});
