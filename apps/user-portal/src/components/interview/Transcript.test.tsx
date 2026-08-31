import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { Transcript } = await import('./Transcript');

describe('Transcript', () => {
  it('marks streaming follow-up content without inventing a question count', () => {
    const markup = renderToStaticMarkup(
      createElement(Transcript, {
        turns: [],
        streamingText: '请继续说明方案落地后的验证方式。',
      }),
    );

    expect(markup).toContain('data-state="streaming"');
    expect(markup).toContain('AI 面试官 · 正在组织追问');
    expect(markup).not.toContain('共 10 题');
  });

  it('scopes the live region to the streaming bubble only', () => {
    const markup = renderToStaticMarkup(
      createElement(Transcript, {
        turns: [
          {
            id: 'turn-1',
            role: 'interviewer',
            stage: 'warmup',
            content: '请先介绍你自己。',
          } as never,
        ],
        streamingText: '接下来说说你的项目。',
      }),
    );

    expect(markup).toMatch(/<article[^>]*aria-live="polite"[^>]*aria-busy="true"/);
    expect(markup).not.toMatch(/<div[^>]*class="transcript"[^>]*aria-live/);
  });

  it('keeps settled turns outside any live region', () => {
    const markup = renderToStaticMarkup(
      createElement(Transcript, {
        turns: [
          {
            id: 'turn-1',
            role: 'interviewer',
            stage: 'warmup',
            content: '请先介绍你自己。',
          } as never,
        ],
        streamingText: '',
      }),
    );

    expect(markup).not.toContain('aria-live');
  });
});
