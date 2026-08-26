import React, { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { LearningDocument } from '@/lib/learning/learning-documents';
import { LearningCenter } from './LearningCenter';
import { learningCourseActionCopy } from './LearningCourseActions';
import { learningRailScrollLeft, LearningStorageNotice } from './LearningLibraryRail';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const activeDocument: LearningDocument = {
  slug: 'agent-basics',
  sourceName: 'Agent Basics.md',
  title: 'Agent 工程基础',
  date: '2026-07-29',
  tags: ['Agent', '工具调用'],
  kind: 'course',
  track: 'AI Agent 工程师完整路线',
  order: 1,
  level: 'foundation',
  durationMinutes: 60,
  summary: '建立 Agent 工程的核心心智模型。',
  content: `# Agent 工程基础

## 核心概念

| 能力 | 作用 |
|---|---|
| Tool Calling | 调用外部能力 |

[查看官方资料](https://example.com/docs)

## 自测

- 能否解释核心概念？
`,
  headings: [
    { depth: 2, id: '核心概念', title: '核心概念' },
    { depth: 2, id: '自测', title: '自测' },
  ],
};

const secondDocument: LearningDocument = {
  ...activeDocument,
  slug: 'rag-guide',
  sourceName: 'RAG Guide.md',
  title: 'RAG 工程指南',
  order: 2,
};

const referenceDocument: LearningDocument = {
  ...activeDocument,
  slug: 'project-review',
  sourceName: '参考项目Review.md',
  title: '参考项目 Review',
  kind: 'reference',
  track: '参考资料',
  order: null,
  level: 'reference',
  durationMinutes: null,
  summary: null,
};

it('renders the library, GFM content and safe external links', () => {
  const markup = renderToStaticMarkup(
    createElement(LearningCenter, {
      documents: [activeDocument, secondDocument, referenceDocument],
      activeDocument,
      openedCourseSlug: activeDocument.slug,
    }),
  );

  expect(markup).toContain('资料架');
  expect(markup).toContain('完整学习路线');
  expect(markup).toContain('0 / 2 课');
  expect(markup).toContain('基础');
  expect(markup).toContain('60 分钟');
  expect(markup).toContain('参考资料');
  expect(markup).toContain('href="/learn?doc=rag-guide"');
  expect(markup).toContain('标记本课已完成');
  expect(markup).toContain('aria-pressed="false"');
  expect(markup).toContain('Review · 自测');
  expect(markup).toContain('href="#自测"');
  expect(markup).toContain('返回学习地图');
  expect(markup).toContain('id="learning-path"');
  expect(markup).toContain('href="#learning-path"');
  expect(markup).toContain('下一课');
  expect(markup).toContain('进入题库验证');
  expect(markup.match(/<h1/g)).toHaveLength(1);
  expect(markup).toContain('<h2 class="learning-article-title">Agent 工程基础</h2>');
  expect(markup).toMatch(/<h3[^>]*id="核心概念"[^>]*>核心概念<\/h3>/);
  expect(markup).toContain('<table>');
  expect(markup).toContain('id="核心概念"');
  expect(markup).toContain('href="https://example.com/docs"');
  expect(markup).toContain('target="_blank"');
  expect(markup).toContain('rel="noreferrer noopener"');
});

it('explains when progress can only be kept for the current visit', () => {
  const markup = renderToStaticMarkup(
    createElement(LearningStorageNotice, { status: 'memory-only' }),
  );

  expect(markup).toContain('role="status"');
  expect(markup).toContain('本次访问仍可继续');
  expect(markup).toContain('刷新后会重置');
  expect(renderToStaticMarkup(createElement(LearningStorageNotice, { status: 'persistent' }))).toBe(
    '',
  );
});

it('keeps course actions large enough for touch input', () => {
  const stylesheet = readFileSync(resolve('src/app/styles/learning-path.css'), 'utf8');
  const actionRule = stylesheet.match(
    /\.learning-course-action-buttons button,[\s\S]*?\.learning-course-action-buttons a \{[^}]+\}/,
  )?.[0];

  expect(actionRule).toContain('min-height: 44px');
  expect(stylesheet).toContain('.learning-library-heading .learning-storage-notice {');
});

it('reserves a desktop docking lane beside the learning outline', () => {
  const stylesheet = readFileSync(resolve('src/app/styles/consumer-learning.css'), 'utf8');

  expect(stylesheet).toMatch(
    /@media \(min-width: 1181px\) \{[\s\S]*?\.learning-outline nav \{\s*padding-right: 20px;\s*\}/,
  );
});

it('centers the active course in an overflowing rail and clamps both edges', () => {
  expect(
    learningRailScrollLeft({
      viewportWidth: 324,
      contentWidth: 1889,
      itemLeft: 1422,
      itemWidth: 230,
    }),
  ).toBe(1375);
  expect(
    learningRailScrollLeft({
      viewportWidth: 324,
      contentWidth: 1889,
      itemLeft: 0,
      itemWidth: 230,
    }),
  ).toBe(0);
  expect(
    learningRailScrollLeft({
      viewportWidth: 324,
      contentWidth: 1889,
      itemLeft: 1800,
      itemWidth: 230,
    }),
  ).toBe(1565);
});

it('closes the learning path honestly when the final course is complete', () => {
  expect(learningCourseActionCopy(true, false, true)).toEqual({
    status: '完整路线已完成',
    heading: '回到学习地图复盘成果，或进入题库继续验证',
    mapLabel: '完成路线 · 返回学习地图',
    emphasizeMap: true,
  });
  expect(learningCourseActionCopy(true, false, false)).toEqual({
    status: '本课已完成',
    heading: '回到学习地图补齐未完成课程，或进入题库继续验证',
    mapLabel: '返回学习地图 · 补齐课程',
    emphasizeMap: true,
  });
  expect(learningCourseActionCopy(true, true, false).heading).toBe('继续巩固或进入下一课');
});

it('shows a useful empty state when no learning document is available', () => {
  const markup = renderToStaticMarkup(
    createElement(LearningCenter, {
      documents: [],
      activeDocument: null,
      openedCourseSlug: null,
    }),
  );

  expect(markup).toContain('还没有可阅读的资料');
  expect(markup).toContain('参考资料');
});
