import React, { createElement, type ReactElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UserAgentFloatButton, UserAgentMobileTrigger } from './UserAgentFloatButton';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('UserAgentFloatButton', () => {
  it('renders the Interview Agent monogram without the abstract aperture mark', () => {
    const markup = renderToStaticMarkup(
      createElement(UserAgentFloatButton, {
        onClick: () => undefined,
        onPointerCancel: () => undefined,
        onPointerDown: () => undefined,
        onPointerMove: () => undefined,
        onPointerUp: () => undefined,
        open: false,
        position: { bottom: 24, right: 24 },
        status: 'idle',
      }),
    );

    expect(markup).toContain('user-agent-float-mark-monogram');
    expect(markup).toContain('user-agent-float-mark-accent');
    expect(markup).toContain('aria-controls="user-agent-drawer"');
    expect(markup).not.toContain('user-agent-mobile-label');
    expect(markup).not.toContain('user-agent-float-mark-aperture');
  });

  it('wires native button click activation for pointer and keyboard input', () => {
    const onClick = vi.fn();
    const props = {
      onClick,
      onPointerCancel: () => undefined,
      onPointerDown: () => undefined,
      onPointerMove: () => undefined,
      onPointerUp: () => undefined,
      open: false,
      position: { bottom: 24, right: 24 },
      status: 'idle' as const,
    };

    const element = UserAgentFloatButton(props) as ReactElement<{ onClick?: typeof onClick }>;

    expect(element.props.onClick).toBe(onClick);
  });

  it('renders a dedicated semantic mobile navigation trigger', () => {
    const markup = renderToStaticMarkup(
      createElement(UserAgentMobileTrigger, {
        onClick: () => undefined,
        open: false,
        status: 'idle',
      }),
    );

    expect(markup).toContain('class="user-agent-mobile-trigger"');
    expect(markup).toContain('aria-label="打开 AI 刷题教练"');
    expect(markup).toContain('aria-controls="user-agent-drawer"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('>教练<');
  });
});

describe('UserAgent desktop trigger sizing', () => {
  it('preserves a 48px target', () => {
    const stylesheet = readFileSync(resolve('src/app/styles/user-agent.css'), 'utf8');
    const desktopRule = stylesheet.match(/\.user-agent-float \{[^}]+\}/)?.[0];

    expect(desktopRule).toContain('width: 48px');
    expect(desktopRule).toContain('height: 48px');
  });
});
