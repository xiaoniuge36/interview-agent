import type { QuestionDifficulty, QuestionType } from '@prisma/client';

const MAX_CANDIDATES = 10;
const MIN_SECTION_LENGTH = 20;
const EASY_DIFFICULTY_MAX_LENGTH = 180;
const MEDIUM_DIFFICULTY_MAX_LENGTH = 800;
const MAX_QUALITY_SCORE = 95;
const MIN_QUALITY_SCORE = 55;
const QUALITY_SCORE_BASE = 50;
const QUALITY_SCORE_LENGTH_DIVISOR = 20;

export type ExtractedCandidate = {
  title: string;
  stem: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  answer: string;
  rubric: Array<{ point: string; score: number; description: string }>;
  qualityScore: number;
  tags: string[];
  sourceContent: string;
};

export class MarkdownImportExtractor {
  extract(markdown: string): ExtractedCandidate[] {
    return splitSections(markdown)
      .filter((section) => section.content.length >= MIN_SECTION_LENGTH)
      .slice(0, MAX_CANDIDATES)
      .map((section, index) => this.toCandidate(section, index));
  }

  private toCandidate(section: MarkdownSection, index: number): ExtractedCandidate {
    const tags = deriveTags(section.content);
    return {
      title: section.title || `Imported topic ${index + 1}`,
      stem: `Based on the following material, explain the topic and its practical trade-offs.\n\n${section.content}`,
      type: 'short_answer',
      difficulty: inferDifficulty(section.content.length),
      answer: section.content,
      rubric: buildRubric(tags),
      qualityScore: scoreSection(section.content.length),
      tags,
      sourceContent: section.content,
    };
  }
}

type MarkdownSection = { title: string; content: string };

function splitSections(markdown: string): MarkdownSection[] {
  const parts = markdown.trim().split(/(?=^#{1,3}\s+)/m);
  const sections = parts.map(parseSection).filter((section) => section.content.length > 0);
  return sections.length ? sections : [{ title: '', content: markdown.trim() }];
}

function parseSection(value: string): MarkdownSection {
  const lines = value.trim().split(/\r?\n/);
  const heading = lines[0]?.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim() ?? '';
  return { title: heading, content: (heading ? lines.slice(1) : lines).join('\n').trim() };
}

function deriveTags(content: string): string[] {
  const candidates = [
    ['RAG', /\brag\b|retrieval/i],
    ['LLM', /\bllm\b|large language model/i],
    ['Agent', /\bagent\b|workflow/i],
    ['Prompt', /prompt/i],
    ['Evaluation', /evaluat|rubric/i],
    ['System Design', /architecture|system design/i],
  ] as const;
  const matches = candidates.filter(([, pattern]) => pattern.test(content)).map(([tag]) => tag);
  return matches.length ? matches : ['Imported Material'];
}

function buildRubric(tags: string[]) {
  const focus = tags.join(', ');
  return [
    { point: 'Core concept', score: 4, description: `Correctly explain the ${focus} concept.` },
    {
      point: 'Practical reasoning',
      score: 3,
      description: 'Connect the concept to a concrete use case.',
    },
    { point: 'Trade-offs', score: 3, description: 'State constraints, risks, or alternatives.' },
  ];
}

function inferDifficulty(length: number): QuestionDifficulty {
  if (length < EASY_DIFFICULTY_MAX_LENGTH) return 'easy';
  if (length < MEDIUM_DIFFICULTY_MAX_LENGTH) return 'medium';
  return 'hard';
}

function scoreSection(length: number): number {
  return Math.min(
    MAX_QUALITY_SCORE,
    Math.max(
      MIN_QUALITY_SCORE,
      Math.round(QUALITY_SCORE_BASE + length / QUALITY_SCORE_LENGTH_DIVISOR),
    ),
  );
}
