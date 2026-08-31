import type { InterviewSession, InterviewStage } from '@interview-agent/contracts';
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

  it('marks only truly visited stages done and highlights the current one', () => {
    const markup = render(
      session('project_deep_dive', ['warmup', 'self_intro', 'jd_core', 'project_deep_dive']),
    );

    expect(stageState(markup, '开场破冰')).toBe('done');
    expect(stageState(markup, '自我介绍')).toBe('done');
    expect(stageState(markup, '岗位核心能力')).toBe('done');
    expect(stageState(markup, '项目深挖')).toBe('current');
    expect(markup).toMatch(/data-state="current"[^>]*aria-current="step"/);
    expect(stageState(markup, '场景判断')).toBe('pending');
  });

  it('does not tick a skipped stage even when it sits before the current one', () => {
    const markup = render(session('jd_core', ['self_intro', 'jd_core']));

    expect(stageState(markup, '开场破冰')).toBe('pending');
    expect(stageState(markup, '基础能力')).toBe('pending');
    expect(stageState(markup, '自我介绍')).toBe('done');
    expect(stageState(markup, '岗位核心能力')).toBe('current');
  });

  it('keeps only visited stages ticked after the report is generated', () => {
    const markup = render(session('report_ready', ['warmup', 'jd_core', 'final_evaluation']));

    expect(markup).not.toContain('data-state="current"');
    expect(stageState(markup, '开场破冰')).toBe('done');
    expect(stageState(markup, '岗位核心能力')).toBe('done');
    expect(stageState(markup, '综合评估')).toBe('done');
    expect(stageState(markup, '自我介绍')).toBe('pending');
    expect(stageState(markup, '项目深挖')).toBe('pending');
  });
});

function render(value: InterviewSession | null) {
  return renderToStaticMarkup(createElement(InterviewStageRail, { session: value }));
}

function session(stage: InterviewSession['stage'], visited: InterviewStage[]): InterviewSession {
  return {
    stage,
    turns: visited.map((turnStage, index) => ({
      id: `turn-${index}`,
      role: index % 2 === 0 ? 'interviewer' : 'candidate',
      stage: turnStage,
    })),
  } as InterviewSession;
}

function stageState(markup: string, label: string): string | null {
  const item = markup.match(
    new RegExp(`<li[^>]*data-state="([^"]+)"[^>]*>(?:(?!</li>)[\\s\\S])*?${label}`, 'u'),
  );
  return item?.[1] ?? null;
}
