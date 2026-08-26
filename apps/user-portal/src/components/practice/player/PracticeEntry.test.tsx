import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeEntry } from './PracticeEntry';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeEntry', () => {
  it('turns the empty practice route into a clear set of training choices', () => {
    const markup = renderToStaticMarkup(<PracticeEntry />);

    expect(markup).toContain('aria-label="把想练的题，组合成一轮专注练习"');
    expect(markup).toContain('consumer-signal-field');
    expect(markup).toContain('选择今天的训练方式');
    expect(markup).toContain('href="/questions"');
    expect(markup).toContain('href="/interview"');
    expect(markup).toContain('href="/reports"');
  });

  it('reserves a desktop docking lane beside the question filters', () => {
    const stylesheet = readFileSync(resolve('src/app/styles/consumer-practice.css'), 'utf8');

    expect(stylesheet).toMatch(
      /@media \(min-width: 1181px\) \{[\s\S]*?\.question-filter-fields \{\s*padding-right: 8px;\s*\}/,
    );
  });
});
