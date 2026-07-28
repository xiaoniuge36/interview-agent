import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminAgentFloatButton } from './AdminAgentFloatButton';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('AdminAgentFloatButton', () => {
  it('renders the Interview Agent monogram without the abstract aperture mark', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAgentFloatButton, {
        onPointerCancel: () => undefined,
        onPointerDown: () => undefined,
        onPointerMove: () => undefined,
        onPointerUp: () => undefined,
        position: { bottom: 24, right: 24 },
        status: 'idle',
      }),
    );

    expect(markup).toContain('admin-agent-float-mark-monogram');
    expect(markup).toContain('admin-agent-float-mark-accent');
    expect(markup).not.toContain('admin-agent-float-mark-aperture');
  });
});
