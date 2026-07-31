import React, { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UserAgentFloatButton } from './UserAgentFloatButton';

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
        position: { bottom: 24, right: 24 },
        status: 'idle',
      }),
    );

    expect(markup).toContain('user-agent-float-mark-monogram');
    expect(markup).toContain('user-agent-float-mark-accent');
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
      position: { bottom: 24, right: 24 },
      status: 'idle' as const,
    };

    const element = UserAgentFloatButton(props) as ReactElement<{ onClick?: typeof onClick }>;

    expect(element.props.onClick).toBe(onClick);
  });
});
