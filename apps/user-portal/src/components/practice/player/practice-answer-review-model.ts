export type AnswerBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string | null; text: string };

type BlockMatch = { block: AnswerBlock; nextIndex: number };

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const UNORDERED_LIST_PATTERN = /^[-*+]\s+(.+)$/;
const ORDERED_LIST_PATTERN = /^\d+[.)]\s+(.+)$/;
const QUOTE_PATTERN = /^>\s?(.*)$/;
const CODE_FENCE_PATTERN = /^```\s*([\w+-]+)?\s*$/;

export function parseAnswerBlocks(answer: string): AnswerBlock[] {
  const lines = answer.replace(/\r/g, '').split('\n');
  const blocks: AnswerBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index]?.trim()) {
      index += 1;
      continue;
    }
    const match =
      codeBlockAt(lines, index) ??
      headingBlockAt(lines, index) ??
      quoteBlockAt(lines, index) ??
      listBlockAt(lines, index) ??
      paragraphBlockAt(lines, index);
    blocks.push(match.block);
    index = match.nextIndex;
  }

  return blocks;
}

function codeBlockAt(lines: string[], index: number): BlockMatch | null {
  const fence = lines[index]?.trim().match(CODE_FENCE_PATTERN);
  if (!fence) return null;
  const codeLines: string[] = [];
  let cursor = index + 1;
  while (cursor < lines.length && !CODE_FENCE_PATTERN.test(lines[cursor]?.trim() ?? '')) {
    codeLines.push(lines[cursor] ?? '');
    cursor += 1;
  }
  return {
    block: { kind: 'code', language: fence[1] ?? null, text: codeLines.join('\n').trimEnd() },
    nextIndex: cursor < lines.length ? cursor + 1 : cursor,
  };
}

function headingBlockAt(lines: string[], index: number): BlockMatch | null {
  const heading = lines[index]?.trim().match(HEADING_PATTERN);
  if (!heading) return null;
  return {
    block: { kind: 'heading', level: heading[1]!.length, text: heading[2]!.trim() },
    nextIndex: index + 1,
  };
}

function quoteBlockAt(lines: string[], index: number): BlockMatch | null {
  if (!QUOTE_PATTERN.test(lines[index]?.trim() ?? '')) return null;
  const { text, nextIndex } = collectLines(lines, index, QUOTE_PATTERN);
  return { block: { kind: 'quote', text }, nextIndex };
}

function listBlockAt(lines: string[], index: number): BlockMatch | null {
  const first = listItem(lines[index] ?? '');
  if (!first) return null;
  const items = [first.text];
  let cursor = index + 1;
  while (cursor < lines.length) {
    const item = listItem(lines[cursor] ?? '');
    if (!item || item.ordered !== first.ordered) break;
    items.push(item.text);
    cursor += 1;
  }
  return { block: { kind: 'list', ordered: first.ordered, items }, nextIndex: cursor };
}

function paragraphBlockAt(lines: string[], index: number): BlockMatch {
  const text: string[] = [];
  let cursor = index;
  while (cursor < lines.length && isParagraphLine(lines, cursor)) {
    text.push(lines[cursor]!.trim());
    cursor += 1;
  }
  return { block: { kind: 'paragraph', text: text.join(' ') }, nextIndex: cursor };
}

function collectLines(lines: string[], index: number, pattern: RegExp) {
  const text: string[] = [];
  let cursor = index;
  while (cursor < lines.length) {
    const match = lines[cursor]?.trim().match(pattern);
    if (!match) break;
    text.push(match[1]!.trim());
    cursor += 1;
  }
  return { text: text.join(' '), nextIndex: cursor };
}

function listItem(line: string) {
  const normalized = line.trim();
  const unordered = normalized.match(UNORDERED_LIST_PATTERN);
  if (unordered) return { ordered: false, text: unordered[1]!.trim() };
  const ordered = normalized.match(ORDERED_LIST_PATTERN);
  return ordered ? { ordered: true, text: ordered[1]!.trim() } : null;
}

function isParagraphLine(lines: string[], index: number) {
  const line = lines[index]?.trim() ?? '';
  return (
    Boolean(line) &&
    !CODE_FENCE_PATTERN.test(line) &&
    !HEADING_PATTERN.test(line) &&
    !QUOTE_PATTERN.test(line) &&
    !UNORDERED_LIST_PATTERN.test(line) &&
    !ORDERED_LIST_PATTERN.test(line)
  );
}
