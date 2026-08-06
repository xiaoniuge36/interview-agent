import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionLabel } from './ActionLabel';
import { SignalField } from './SignalField';
import { SplitRevealText } from './SplitRevealText';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('consumer motion primitives', () => {
  it('keeps the complete headline accessible while splitting visual characters', () => {
    const markup = renderToStaticMarkup(<SplitRevealText text="今天开始" />);

    expect(markup).toContain('aria-label="今天开始"');
    expect(markup.match(/consumer-reveal-character/g)).toHaveLength(4);
  });

  it('marks the decorative Agent signal field as hidden', () => {
    const markup = renderToStaticMarkup(<SignalField />);

    expect(markup).toContain('consumer-signal-field');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('RAG');
  });

  it('renders both normal and busy action copy', () => {
    expect(renderToStaticMarkup(<ActionLabel label="开始训练" />)).toContain('开始训练');
    expect(
      renderToStaticMarkup(<ActionLabel label="开始训练" busy busyLabel="正在创建题单…" />),
    ).toContain('正在创建题单…');
  });

  it('turns motion off for user and system reduced-motion preferences', () => {
    const stylesheet = readFileSync(resolve('src/app/styles/consumer-motion.css'), 'utf8');

    expect(stylesheet).toContain("html[data-motion='off'] .consumer-reveal-character");
    expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stylesheet).toContain('animation: none');
  });
});
