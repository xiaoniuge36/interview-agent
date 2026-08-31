import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DictationButton } from './DictationButton';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('DictationButton', () => {
  // 服务端渲染阶段等价于「无 Web Speech API」的环境，正好覆盖不支持分支。
  it('keeps a disabled explained button instead of vanishing when speech is unsupported', () => {
    const markup = renderToStaticMarkup(
      createElement(DictationButton, { onTranscript: () => undefined }),
    );

    expect(markup).toContain('语音输入');
    expect(markup).toContain('title="当前浏览器不支持语音输入"');
    expect(markup).toContain('aria-label="语音输入（当前浏览器不支持）"');
    expect(markup).toMatch(/<button[^>]*disabled/);
    expect(markup).toContain('data-supported="false"');
  });
});
