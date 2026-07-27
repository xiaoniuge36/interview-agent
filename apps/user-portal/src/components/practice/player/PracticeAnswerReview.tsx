'use client';

import { useState } from 'react';
import { parseAnswerBlocks, type AnswerBlock } from './practice-answer-review-model';

const PREVIEW_BLOCK_COUNT = 4;
const MAX_TAG_COUNT = 3;

type PracticeAnswerReviewProps = {
  answer: string;
  answerCurrent: boolean;
  tags: string[];
};

export function PracticeAnswerReview({ answer, answerCurrent, tags }: PracticeAnswerReviewProps) {
  const [expanded, setExpanded] = useState(false);
  const blocks = parseAnswerBlocks(answer);
  const hiddenCount = Math.max(0, blocks.length - PREVIEW_BLOCK_COUNT);
  const visibleBlocks = expanded ? blocks : blocks.slice(0, PREVIEW_BLOCK_COUNT);

  return (
    <section className="practice-feedback-answer practice-answer-review">
      <header>
        <div className="practice-answer-review-title">
          <span>我的回答</span>
          <small>{answerCurrent ? '已保存' : '有未保存修改'}</small>
        </div>
        <span className="practice-answer-review-count">结构化阅读 · {blocks.length} 个阅读块</span>
      </header>
      {blocks.length ? (
        <div className="practice-answer-review-content" data-expanded={expanded}>
          {visibleBlocks.map((block, index) => (
            <AnswerBlockView block={block} index={index} key={`${block.kind}:${index}`} />
          ))}
        </div>
      ) : (
        <p className="practice-answer-review-empty">还没有可阅读的回答内容。</p>
      )}
      {hiddenCount ? (
        <button
          className="practice-answer-review-toggle"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '收起回答' : `展开剩余 ${hiddenCount} 段`}
        </button>
      ) : null}
      <footer>
        {answer.length.toLocaleString()} 字 · {tags.slice(0, MAX_TAG_COUNT).join(' · ')}
      </footer>
    </section>
  );
}

function AnswerBlockView({ block, index }: { block: AnswerBlock; index: number }) {
  return (
    <section className="practice-answer-review-block" data-kind={block.kind}>
      <span className="practice-answer-review-marker" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <AnswerBlockContent block={block} />
    </section>
  );
}

function AnswerBlockContent({ block }: { block: AnswerBlock }) {
  if (block.kind === 'heading') return <h3 data-level={block.level}>{block.text}</h3>;
  if (block.kind === 'paragraph') return <p>{block.text}</p>;
  if (block.kind === 'quote') return <blockquote>{block.text}</blockquote>;
  if (block.kind === 'code') {
    return (
      <pre>
        {block.language ? <span>{block.language}</span> : null}
        <code>{block.text}</code>
      </pre>
    );
  }
  const List = block.ordered ? 'ol' : 'ul';
  return (
    <List>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </List>
  );
}
