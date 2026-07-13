import { MarkdownImportExtractor } from './markdown-import-extractor';

describe('MarkdownImportExtractor', () => {
  it('turns markdown sections into reviewable candidate questions', () => {
    const candidates = new MarkdownImportExtractor().extract(`
# Retrieval strategy
Retrieval augmented generation uses a retriever to find grounded context before an LLM drafts an answer.

# Evaluation loop
Use a rubric to evaluate groundedness, relevance, and answer quality before publication.
`);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      title: 'Retrieval strategy',
      type: 'short_answer',
      tags: ['RAG', 'LLM'],
    });
    expect(candidates[1]?.rubric).toHaveLength(3);
  });

  it('falls back to one candidate when markdown has no headings', () => {
    const candidates = new MarkdownImportExtractor().extract(
      'A sufficiently detailed source document explains a single technical topic for review.',
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.title).toBe('Imported topic 1');
  });
});
