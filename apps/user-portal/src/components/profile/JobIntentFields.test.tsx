import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import { DEFAULT_JOB_FORM } from './job-form';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

// FieldIcon 在模块顶层就渲染 JSX，必须先挂全局 React 再动态加载。
const { JobIntentFields } = await import('./JobIntentFields');

function render(jdText: string) {
  return renderToStaticMarkup(
    createElement(JobIntentFields, {
      value: { ...DEFAULT_JOB_FORM, jdText },
      onChange: () => undefined,
      onApplyRole: () => undefined,
    }),
  );
}

describe('JobIntentFields JD 字数反馈', () => {
  it('在 JD 文本框下展示当前字数与上限', () => {
    const jd = '负责 Agent 平台的检索与编排。';
    const markup = render(jd);

    expect(markup).toContain(`当前 ${jd.length} / 上限 ${CONTRACT_LIMITS.longText} 字`);
    expect(markup).not.toContain('data-warning');
  });

  it('达到上限九成后进入警示态', () => {
    const nearLimit = 'J'.repeat(Math.ceil(CONTRACT_LIMITS.longText * 0.9));
    const markup = render(nearLimit);

    expect(markup).toContain('data-warning="true"');
    expect(markup).toContain(`当前 ${nearLimit.length} / 上限 ${CONTRACT_LIMITS.longText} 字`);
  });
});
