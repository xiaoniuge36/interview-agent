import type { ReactNode } from 'react';

export type AdminAgentContentBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'section'; title: string; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

type ParseResult = { block: AdminAgentContentBlock; next: number };
const MARKDOWN_BOLD_DELIMITER_LENGTH = 2;

export function AdminAgentMessageContent({ content }: { content: string }) {
  return (
    <div className="admin-agent-message-content">
      {parseAdminAgentContent(content).map(renderBlock)}
    </div>
  );
}

export function parseAdminAgentContent(content: string): AdminAgentContentBlock[] {
  const lines = content.replaceAll('\r\n', '\n').split('\n');
  const blocks: AdminAgentContentBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]?.trim() ?? '';
    if (!line) {
      index += 1;
      continue;
    }
    if (isTableLine(line)) {
      const result = readTable(lines, index);
      blocks.push(result.block);
      index = result.next;
      continue;
    }
    if (isListLine(line)) {
      const result = readList(lines, index);
      blocks.push(result.block);
      index = result.next;
      continue;
    }
    const section = parseSection(line);
    if (section) {
      blocks.push(section);
      index += 1;
      continue;
    }
    const result = readParagraph(lines, index);
    blocks.push(result.block);
    index = result.next;
  }
  return blocks;
}

function renderBlock(block: AdminAgentContentBlock, index: number) {
  if (block.kind === 'list')
    return (
      <ul className="admin-agent-message-list-content" key={index}>
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  if (block.kind === 'table') return <MessageTable block={block} key={index} />;
  if (block.kind === 'section')
    return (
      <section className="admin-agent-message-section" key={index}>
        <span>{block.title}</span>
        {block.text ? <p>{renderInline(block.text)}</p> : null}
      </section>
    );
  return <p key={index}>{renderInline(block.text)}</p>;
}

function MessageTable({ block }: { block: Extract<AdminAgentContentBlock, { kind: 'table' }> }) {
  return (
    <div className="admin-agent-message-table-wrap">
      <table className="admin-agent-message-table">
        <thead>
          <tr>
            {block.headers.map((header, index) => (
              <th key={`${header}-${index}`}>{renderInline(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {block.headers.map((_, cellIndex) => (
                <td key={cellIndex}>{renderInline(row[cellIndex] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function readTable(lines: string[], start: number): ParseResult {
  const rawRows: string[][] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index];
    if (!line || !isTableLine(line.trim())) break;
    rawRows.push(splitTableRow(line));
    index += 1;
  }
  const headers = rawRows[0] ?? [];
  const rows = rawRows.slice(isTableSeparator(rawRows[1]) ? 2 : 1);
  return { block: { kind: 'table', headers, rows }, next: index };
}

function readList(lines: string[], start: number): ParseResult {
  const items: string[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index];
    if (!line || !isListLine(line.trim())) break;
    items.push(line.trim().replace(/^[-*•]\s+/, ''));
    index += 1;
  }
  return { block: { kind: 'list', items }, next: index };
}

function readParagraph(lines: string[], start: number): ParseResult {
  const content: string[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index]?.trim() ?? '';
    if (!line || isTableLine(line) || isListLine(line) || parseSection(line)) break;
    content.push(line);
    index += 1;
  }
  return { block: { kind: 'paragraph', text: content.join('\n') }, next: index };
}

function parseSection(line: string): Extract<AdminAgentContentBlock, { kind: 'section' }> | null {
  const match =
    line.match(/^\*\*(.+?)\*\*\s*[：:]?\s*(.*)$/) ??
    line.match(/^#{1,3}\s+(.+?)\s*$/) ??
    line.match(/^(结果概览|关键数据|结论|下一步|风险提示)[：:]\s*(.*)$/);
  if (!match) return null;
  return { kind: 'section', title: (match[1] ?? '').replace(/[：:]$/, ''), text: match[2] ?? '' };
}

function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return (
          <strong key={index}>
            {part.slice(MARKDOWN_BOLD_DELIMITER_LENGTH, -MARKDOWN_BOLD_DELIMITER_LENGTH)}
          </strong>
        );
      return part
        .split('\n')
        .flatMap((line, lineIndex) =>
          lineIndex ? [<br key={`${index}-${lineIndex}`} />, line] : [line],
        );
    });
}

function isTableLine(line: string) {
  return /^\|.+\|$/.test(line);
}

function isTableSeparator(row: string[] | undefined) {
  if (!row?.length) return false;
  return row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isListLine(line: string) {
  return /^[-*•]\s+/.test(line);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}
