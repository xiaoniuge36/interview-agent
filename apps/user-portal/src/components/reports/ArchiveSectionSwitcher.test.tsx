import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ArchiveSectionSwitcher, type ArchiveSectionCounts } from './ArchiveSectionSwitcher';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('ArchiveSectionSwitcher', () => {
  it('renders both sections and marks the active one', () => {
    const markup = renderSwitcher('records', {});

    expect(markup).toContain('训练记录');
    expect(markup).toContain('错题本');
    expect(markup).toContain('刷题与面试的全部复盘');
    expect(markup).toContain('低分题集中复练');
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup).toContain('class="active"');
  });

  it('marks the mistakes section active when selected', () => {
    const markup = renderSwitcher('mistakes', {});
    const mistakesButton = markup.slice(markup.indexOf('错题本') - 200, markup.indexOf('错题本'));

    expect(mistakesButton).toContain('aria-pressed="true"');
  });

  it('hides count badges until totals are known, then shows them per section', () => {
    expect(renderSwitcher('records', {})).not.toContain('</i>');

    const markup = renderSwitcher('records', { records: 29, mistakes: 12 });
    expect(markup).toContain('>29</i>');
    expect(markup).toContain('>12</i>');
  });
});

function renderSwitcher(section: 'records' | 'mistakes', counts: ArchiveSectionCounts) {
  return renderToStaticMarkup(
    createElement(ArchiveSectionSwitcher, { section, counts, onChange: vi.fn() }),
  );
}
