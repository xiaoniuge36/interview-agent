'use client';

import type { PracticeItemSolution, PracticeSession } from '@interview-agent/contracts';
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';

type PracticeItemReviewDialogProps = {
  open: boolean;
  item: PracticeSession['items'][number];
  draft: string;
  solution: PracticeItemSolution | undefined;
  onClose: () => void;
};

export function PracticeItemReviewDialog(props: PracticeItemReviewDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!props.open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => titleRef.current?.focus());
    return () => previousFocus?.focus();
  }, [props.open]);
  if (!props.open) return null;

  return (
    <div className="practice-item-review-backdrop" onMouseDown={props.onClose}>
      <section
        className="practice-item-review"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-item-review-title"
        ref={dialogRef}
        onKeyDown={(event) => handleDialogKeydown(event, dialogRef.current, props.onClose)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="practice-item-review-header">
          <div>
            <span>{`第 ${props.item.sequence} 题 · ${props.item.question.tags.slice(0, 2).join(' · ')}`}</span>
            <h2 id="practice-item-review-title" ref={titleRef} tabIndex={-1}>
              本题复盘
            </h2>
            <p>{props.item.question.title}</p>
          </div>
          <button type="button" onClick={props.onClose} aria-label="关闭本题复盘">
            关闭
          </button>
        </header>

        <div className="practice-item-review-body">
          <ReviewSection title="我的回答" tone="answer">
            <p>{props.draft.trim() || props.item.answer || '这道题尚未保存回答。'}</p>
          </ReviewSection>
          <SolutionReview solution={props.solution} />
          <EvaluationReview item={props.item} />
        </div>
      </section>
    </div>
  );
}

function handleDialogKeydown(
  event: KeyboardEvent<HTMLElement>,
  dialog: HTMLElement | null,
  onClose: () => void,
) {
  if (event.key === 'Escape') {
    onClose();
    return;
  }
  if (event.key !== 'Tab' || !dialog) return;
  const focusable = [
    ...dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ];
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable.at(-1)!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function SolutionReview({ solution }: { solution: PracticeItemSolution | undefined }) {
  if (!solution) {
    return <ReviewSection title="标准解析">完成作答后可打开标准答案与评分要点。</ReviewSection>;
  }
  return (
    <ReviewSection title="标准解析" tone="solution">
      <p>{solution.referenceAnswer}</p>
      <ul className="practice-item-review-rubric">
        {solution.rubric.map((rubric) => (
          <li key={rubric.point}>
            <strong>{rubric.point}</strong>
            <span>{rubric.description}</span>
          </li>
        ))}
      </ul>
    </ReviewSection>
  );
}

function EvaluationReview({ item }: Pick<PracticeItemReviewDialogProps, 'item'>) {
  const evaluation = item.evaluation;
  if (!evaluation) {
    return (
      <ReviewSection title="AI 评价">
        尚未完成 AI 评价。你可以回到答题教练中发起评价。
      </ReviewSection>
    );
  }
  return (
    <ReviewSection title="AI 评价" tone="evaluation">
      <div className="practice-item-review-score">
        <strong>{Math.round(evaluation.score)}</strong>
        <span>本题得分</span>
      </div>
      <p>{evaluation.feedback}</p>
      {evaluation.missingPoints.length ? (
        <div className="practice-item-review-gaps">
          <strong>还可补强</strong>
          <ul>
            {evaluation.missingPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {evaluation.followUpQuestion ? <blockquote>{evaluation.followUpQuestion}</blockquote> : null}
    </ReviewSection>
  );
}

function ReviewSection(props: {
  title: string;
  tone?: 'answer' | 'solution' | 'evaluation';
  children: ReactNode;
}) {
  return (
    <section className="practice-item-review-section" data-tone={props.tone}>
      <header>
        <span aria-hidden="true" />
        <h3>{props.title}</h3>
      </header>
      <div>{props.children}</div>
    </section>
  );
}
