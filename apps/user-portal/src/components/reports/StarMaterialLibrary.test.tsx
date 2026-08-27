import type { StarMaterial } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StarMaterialLibraryContent } from './StarMaterialLibrary';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function material(overrides: Partial<StarMaterial> = {}): StarMaterial {
  return {
    id: 'eval-1',
    practiceItemId: 'item-1',
    questionId: 'q-1',
    questionTitle: '讲一次你主导的高风险发布',
    questionType: 'behavioral',
    tags: ['发布', '稳定性'],
    answer: '我在项目中主导了灰度发布方案。',
    improvedAnswer: '情境：大促前的支付链路改造……',
    score: 84,
    dimensionScores: [{ dimension: 'structure', score: 80, comment: '结构完整' }],
    evaluatedAt: '2026-08-27T10:00:00.000Z',
    ...overrides,
  };
}

function render(materials: StarMaterial[]) {
  return renderToStaticMarkup(createElement(StarMaterialLibraryContent, { materials }));
}

describe('StarMaterialLibraryContent', () => {
  it('把高分作答渲染为可复用素材卡', () => {
    const markup = render([material()]);

    expect(markup).toContain('讲一次你主导的高风险发布');
    expect(markup).toContain('行为面试');
    expect(markup).toContain('我的作答');
    expect(markup).toContain('AI 高分示范');
    expect(markup).toContain('结构条理');
    expect(markup).toContain('复制素材');
  });

  it('缺少示范答案时不渲染示范区块', () => {
    const markup = render([material({ improvedAnswer: null })]);

    expect(markup).not.toContain('AI 高分示范');
    expect(markup).toContain('复制素材');
  });

  it('空素材库给出行为面试题的下一步入口', () => {
    const markup = render([]);

    expect(markup).toContain('素材库还没有内容');
    expect(markup).toContain('href="/questions?type=behavioral"');
  });
});
