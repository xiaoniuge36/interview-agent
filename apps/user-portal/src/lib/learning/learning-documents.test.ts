import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  findRequestedLearningDocument,
  findLearningReviewHeading,
  loadLearningDocuments,
  selectLearningDocument,
} from './learning-documents';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('learning documents', () => {
  it('discovers Markdown files and extracts reading metadata', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(
      join(root, 'Agent Basics.md'),
      `---
title: Agent 工程基础
date: 2026-07-29
tags: [Agent, 工程实践]
---

# Agent 工程基础

## 核心概念

正文。

### Tool Calling

更多正文。
`,
      'utf8',
    );
    await writeFile(join(root, 'ignore.txt'), '# 不应进入目录', 'utf8');

    const documents = await loadLearningDocuments(root);

    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      slug: 'agent-basics',
      sourceName: 'Agent Basics.md',
      title: 'Agent 工程基础',
      date: '2026-07-29',
      tags: ['Agent', '工程实践'],
      kind: 'reference',
      track: '参考资料',
      order: null,
      level: 'reference',
      durationMinutes: null,
    });
    expect(documents[0]?.content).not.toContain('title: Agent 工程基础');
    expect(documents[0]?.headings).toEqual([
      { depth: 2, id: '核心概念', title: '核心概念' },
      { depth: 3, id: 'tool-calling', title: 'Tool Calling' },
    ]);
  });
});

describe('learning document ordering', () => {
  it('falls back to the first heading and sorts newer documents first', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(join(root, 'older.md'), '# 较早资料\n\n## 内容', 'utf8');
    await writeFile(join(root, 'newer.md'), '---\ndate: 2026-07-30\n---\n\n# 较新资料\n', 'utf8');

    const documents = await loadLearningDocuments(root);

    expect(documents.map((document) => document.title)).toEqual(['较新资料', '较早资料']);
    expect(documents[1]?.tags).toEqual([]);
  });
});

describe('nested learning documents', () => {
  it('discovers nested courses and parses ordered curriculum metadata', async () => {
    const root = await createTemporaryDirectory();
    const courseDirectory = join(root, '学习路线');
    await mkdir(courseDirectory);
    await writeFile(join(root, 'reference.md'), '---\ndate: 2026-08-01\n---\n# 参考索引', 'utf8');
    await writeFile(join(courseDirectory, '02-tools.md'), courseMarkdown(2, '工具系统'), 'utf8');
    await writeFile(join(courseDirectory, '01-agent.md'), courseMarkdown(1, 'Agent 基础'), 'utf8');

    const documents = await loadLearningDocuments(root);

    expect(documents.map((document) => document.title)).toEqual([
      'Agent 基础',
      '工具系统',
      '参考索引',
    ]);
    expect(documents[0]).toMatchObject({
      slug: '学习路线-01-agent',
      sourceName: '学习路线/01-agent.md',
      kind: 'course',
      track: 'AI Agent 工程师完整路线',
      order: 1,
      level: 'foundation',
      durationMinutes: 60,
      summary: '建立可解释的 Agent 工程心智模型',
    });
  });

  it('ignores Markdown headings inside fenced code blocks', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(root + '/code.md', '# 示例\n\n```md\n## 伪章节\n```\n\n## 真章节', 'utf8');

    const documents = await loadLearningDocuments(root);

    expect(documents[0]?.headings).toEqual([{ depth: 2, id: '真章节', title: '真章节' }]);
  });
});

describe('learning document selection', () => {
  it('returns an empty library when the reference directory is unavailable', async () => {
    const root = await createTemporaryDirectory();

    await expect(loadLearningDocuments(join(root, 'missing'))).resolves.toEqual([]);
  });

  it('opens the requested document and falls back to the first available document', () => {
    const documents = [
      { slug: 'first', title: '第一篇' },
      { slug: 'second', title: '第二篇' },
    ];

    expect(selectLearningDocument(documents, 'second')?.title).toBe('第二篇');
    expect(selectLearningDocument(documents, 'missing')?.title).toBe('第一篇');
    expect(selectLearningDocument([], 'missing')).toBeNull();
  });

  it('distinguishes an explicit document request from the default fallback', () => {
    const documents = [
      { slug: 'first', title: '第一篇' },
      { slug: 'second', title: '第二篇' },
    ];

    expect(findRequestedLearningDocument(documents, 'second')?.title).toBe('第二篇');
    expect(findRequestedLearningDocument(documents, ['second', 'first'])?.title).toBe('第二篇');
    expect(findRequestedLearningDocument(documents, 'missing')).toBeNull();
    expect(findRequestedLearningDocument(documents, undefined)).toBeNull();
  });
});

describe('learning review heading', () => {
  it('uses the final self-review checkpoint and returns null when none exists', () => {
    const headings = [
      { depth: 2 as const, id: 'baseline', title: '入学基线自测' },
      { depth: 2 as const, id: 'build', title: '本课动手实验' },
      { depth: 2 as const, id: 'final-review', title: 'Production Readiness Review' },
    ];

    expect(findLearningReviewHeading(headings)).toEqual(headings[2]);
    expect(findLearningReviewHeading([headings[1]!])).toBeNull();
  });
});

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'interview-agent-learning-'));
  temporaryDirectories.push(directory);
  return directory;
}

function courseMarkdown(order: number, title: string) {
  return `---
title: ${title}
kind: course
track: AI Agent 工程师完整路线
order: ${order}
level: foundation
duration: 60
summary: 建立可解释的 Agent 工程心智模型
tags: [Agent, 工程实践]
---

# ${title}

## 学习目标
`;
}
