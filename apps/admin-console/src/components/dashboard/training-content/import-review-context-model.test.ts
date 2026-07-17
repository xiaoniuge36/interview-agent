import { describe, expect, it } from 'vitest';
import { sourceChunkPresentation, sourceChunksForCandidate } from './import-review-context-model';

describe('sourceChunkPresentation', () => {
  it('turns an opaque source chunk number into a readable review cue', () => {
    const presentation = sourceChunkPresentation(
      {
        sequence: 2,
        content: '  结合学习文档、学习笔记与面试题，整理出适合面试前集中复习的知识点。  ',
      },
      10,
    );

    expect(presentation).toEqual({
      title: '资料段落 2 / 10',
      preview: '结合学习文档、学习笔记与面试题，整理出适合面试前集中复习的知识点。',
      characterCount: 33,
    });
  });

  it('keeps long source content scannable in the collapsed row', () => {
    const presentation = sourceChunkPresentation(
      { sequence: 1, content: '这是用于验证折叠行摘要截断行为的原文内容。'.repeat(8) },
      1,
    );

    expect(presentation.preview).toHaveLength(73);
    expect(presentation.preview).toMatch(/…$/);
  });
});

describe('sourceChunksForCandidate', () => {
  it('keeps only the source paragraphs referenced by the current candidate question', () => {
    const chunks = [
      { sequence: 1, content: '第一段原文' },
      { sequence: 2, content: '第二段原文' },
      { sequence: 3, content: '第三段原文' },
    ];

    expect(sourceChunksForCandidate(chunks, ['knowledge://asset/import-1/chunk/2'])).toEqual([
      { sequence: 2, content: '第二段原文' },
    ]);
  });

  it('does not fall back to the full batch when the candidate has no recognized source reference', () => {
    const chunks = [{ sequence: 1, content: '第一段原文' }];

    expect(sourceChunksForCandidate(chunks, ['import://legacy-source'])).toEqual([]);
  });
});
