import React, { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { LearningDocument } from '@/lib/learning/learning-document-model';
import { LearningCenter } from './LearningCenter';
import { learningCourseActionCopy } from './LearningCourseActions';
import { LearningStorageNotice } from './LearningLibraryProgress';
import { groupCoursesByTrack, learningRailScrollOffset } from './LearningLibraryRail';

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
  expect(markup).toContain('复习本节 · 自测');
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

it('groups courses by track and summarizes multi-track libraries', () => {
  const softSkillCourse: LearningDocument = {
    ...activeDocument,
    slug: 'star-method',
    sourceName: 'STAR.md',
    title: 'STAR 行为面试与项目深挖',
    track: '求职通用能力',
    order: 20,
  };
  const groups = groupCoursesByTrack([activeDocument, secondDocument, softSkillCourse]);
  expect(groups.map((group) => group.track)).toEqual(['AI Agent 工程师完整路线', '求职通用能力']);
  expect(groups[0]?.courses.map((course) => course.slug)).toEqual(['agent-basics', 'rag-guide']);
  expect(groups[1]?.courses.map((course) => course.slug)).toEqual(['star-method']);

  const markup = renderToStaticMarkup(
    createElement(LearningCenter, {
      documents: [activeDocument, secondDocument, softSkillCourse, referenceDocument],
      activeDocument,
      openedCourseSlug: activeDocument.slug,
    }),
  );
  expect(markup).toContain('AI Agent 工程师完整路线 等 2 个方向');
  expect(markup).toContain('求职通用能力');
  expect(markup).toContain('0 / 3 课');

  // 默认只展开当前文档所在组；折叠组保留链接 DOM（hidden），支持直达与 SEO。
  expect(markup.match(/aria-expanded="true"/g)).toHaveLength(1);
  expect(markup.match(/aria-expanded="false"/g)).toHaveLength(2);
  expect(markup).toContain('href="/learn?doc=star-method"');
  expect(markup).toMatch(/<nav hidden=""[^>]*>(?:(?!<\/nav>).)*star-method/);
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

it('centers the active document in an overflowing rail and clamps both edges', () => {
  expect(
    learningRailScrollOffset({
      viewportSize: 324,
      contentSize: 1889,
      itemStart: 1422,
      itemSize: 230,
    }),
  ).toBe(1375);
  expect(
    learningRailScrollOffset({
      viewportSize: 324,
      contentSize: 1889,
      itemStart: 0,
      itemSize: 230,
    }),
  ).toBe(0);
  expect(
    learningRailScrollOffset({
      viewportSize: 324,
      contentSize: 1889,
      itemStart: 1800,
      itemSize: 230,
    }),
  ).toBe(1565);
});

it('closes the learning path honestly when the final course is complete', () => {
  // 路线完成后主按钮从「返回地图」对调为「去题库验证本主题」。
  expect(learningCourseActionCopy(true, false, true)).toEqual({
    status: '完整路线已完成',
    heading: '去题库验证本主题，或回学习地图复盘成果',
    mapLabel: '完成路线 · 返回学习地图',
    emphasizeMap: false,
    emphasizeVerification: true,
  });
  expect(learningCourseActionCopy(true, false, false)).toEqual({
    status: '本课已完成',
    heading: '回到学习地图补齐未完成课程，或进入题库继续验证',
    mapLabel: '返回学习地图 · 补齐课程',
    emphasizeMap: true,
    emphasizeVerification: false,
  });
  expect(learningCourseActionCopy(true, true, false).heading).toBe('继续巩固或进入下一课');
});

it('shows a user-facing empty state with training exits instead of developer hints', () => {
  const markup = renderToStaticMarkup(
    createElement(LearningCenter, {
      documents: [],
      activeDocument: null,
      openedCourseSlug: null,
    }),
  );

  expect(markup).toContain('课程内容准备中');
  expect(markup).toContain('去刷题');
  expect(markup).toContain('href="/questions"');
  expect(markup).toContain('去模拟面试');
  expect(markup).toContain('href="/interview"');
  expect(markup).not.toContain('LEARNING LIBRARY');
  expect(markup).not.toContain('Markdown');
});
