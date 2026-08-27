import type { InterviewSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { InterviewStageRail } = await import('./InterviewStageRail');

describe('InterviewStageRail', () => {
  it('previews all stages as pending before a session starts', () => {
    const markup = render(null);

    expect(markup).toContain('面试阶段进度');
    expect(markup).toContain('开场破冰');
    expect(markup).toContain('综合评估');
    expect(markup).not.toContain('data-state="current"');
    expect(markup).not.toContain('data-state="done"');
  });

  it('marks earlier stages done and highlights the current one', () => {
    const markup = render(session('project_deep_dive'));

    expect(markup).toMatch(/data-state="done"[^>]*>[\s\S]*?开场破冰/);
    expect(markup).toMatch(/data-state="current"[^>]*aria-current="step"[\s\S]*?项目深挖/);
    expect(markup).toMatch(/data-state="pending"[^>]*>[\s\S]*?场景判断/);
  });

  it('treats a generated report as every stage completed', () => {
    const markup = render(session('report_ready'));

    expect(markup).not.toContain('data-state="current"');
    expect(markup).not.toContain('data-state="pending"');
  });
});

function render(value: InterviewSession | null) {
  return renderToStaticMarkup(createElement(InterviewStageRail, { session: value }));
}

function session(stage: InterviewSession['stage']): InterviewSession {
  return { stage } as InterviewSession;
}
