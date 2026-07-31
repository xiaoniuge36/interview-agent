import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningCourseActions } from './LearningCourseActions';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const progressMock = vi.hoisted(() => ({
  latestVerification: null as null | {
    sessionId: string;
    topic: string;
    score: number | null;
    answerCount: number;
    recordedAt: string;
  },
}));

vi.mock('./LearningProgressProvider', () => ({
  useLearningProgress: () => ({
    isCompleted: () => false,
    latestVerificationFor: () => progressMock.latestVerification,
    summary: { total: 8, completed: 0 },
    toggleCompleted: vi.fn(),
  }),
}));

describe('LearningCourseActions', () => {
  beforeEach(() => {
    progressMock.latestVerification = null;
  });

  registerVerificationStartTest();
  registerLocalVerificationRecordTest();
});

function registerVerificationStartTest() {
  it('keeps the course context when starting the documented ReAct verification', () => {
    const markup = renderToStaticMarkup(
      <LearningCourseActions
        course={{
          slug: '01-agent基础与上下文工程',
          sourceName: '学习路线/01-Agent基础与上下文工程.md',
          title: 'Agent 基础与上下文工程',
          kind: 'course',
          track: 'AI Agent 工程师完整路线',
          order: 1,
          level: 'foundation',
          durationMinutes: 75,
        }}
        nextCourse={null}
        reviewHeading={null}
      />,
    );

    expect(markup).toContain(
      'href="/questions?source=learn&amp;course=01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B&amp;topic=react"',
    );
    expect(markup).toContain('进入题库验证 · ReAct');
  });
}

function registerLocalVerificationRecordTest() {
  it('labels a successful practice report as a local verification record', () => {
    progressMock.latestVerification = {
      sessionId: 'session-verified',
      topic: 'ReAct',
      score: 86,
      answerCount: 3,
      recordedAt: '2026-07-30T08:00:00.000Z',
    };
    const markup = renderToStaticMarkup(
      <LearningCourseActions
        course={{
          slug: '01-agent基础与上下文工程',
          sourceName: '学习路径/01-Agent基础与上下文工程.md',
          title: 'Agent 基础与上下文工程',
          kind: 'course',
          track: 'AI Agent 工程师完整路线',
          order: 1,
          level: 'foundation',
          durationMinutes: 75,
        }}
        nextCourse={null}
        reviewHeading={null}
      />,
    );

    expect(markup).toContain('本机最近练习/验证记录');
    expect(markup).toContain('ReAct');
    expect(markup).toContain('86');
    expect(markup).toContain('已答 3 题');
    expect(markup).toContain('2026-07-30');
    expect(markup).toContain('再次验证');
  });
}
