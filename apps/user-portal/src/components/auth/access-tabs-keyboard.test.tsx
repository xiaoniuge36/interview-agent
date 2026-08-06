import React, { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AccessMode } from './access-types';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

let AccessTabsComponent: ComponentType<{
  mode: AccessMode;
  onChange: (mode: AccessMode) => void;
}>;
let resolveTabKey: (mode: AccessMode, key: string) => AccessMode | null;

beforeAll(async () => {
  const accessModule = await import('./LocalAccessScreen');
  AccessTabsComponent = accessModule.AccessTabs;
  resolveTabKey = accessModule.resolveAccessTabKey;
});

describe('access tabs keyboard navigation', () => {
  it.each([
    ['sign-in', 'ArrowRight', 'register'],
    ['register', 'ArrowRight', 'sign-in'],
    ['sign-in', 'ArrowLeft', 'register'],
    ['register', 'ArrowLeft', 'sign-in'],
    ['register', 'Home', 'sign-in'],
    ['sign-in', 'End', 'register'],
    ['sign-in', 'Escape', null],
  ] as const)('resolves %s + %s to %s', (mode, key, expected) => {
    expect(resolveTabKey(mode, key)).toBe(expected);
  });

  it('uses roving tab stops and explicit tab identities', () => {
    const markup = renderToStaticMarkup(
      createElement(AccessTabsComponent, {
        mode: 'register',
        onChange: () => undefined,
      }),
    );

    expect(markup).toMatch(/id="sign-in-tab"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
    expect(markup).toMatch(/id="register-tab"[^>]*aria-selected="true"[^>]*tabindex="0"/);
    expect(markup).toContain('aria-controls="sign-in-panel"');
    expect(markup).toContain('aria-controls="register-panel"');
  });
});
