'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MistakeBook as MistakeBookData, MistakeBookItem } from '@interview-agent/contracts';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { listPracticeMistakes, startMistakeReview } from '@/lib/practice-api';
import {
  isMistakeBookReturnHash,
  mistakeBookReviewPracticeHref,
  MISTAKE_BOOK_RETURN_ANCHOR_ID,
} from '@/components/practice/player/practice-return-origin';

const REVIEW_MINUTES_PER_QUESTION = 8;
const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' });

type MistakeState =
  { status: 'loading' } | { status: 'ready'; book: MistakeBookData } | { status: 'error' };

export function MistakeBook() {
  const source = useMistakeBookData();
  const review = useMistakeReview();
  const returnedFromReview = useMistakeBookReturnFocus(source.state.status);
  if (source.state.status === 'loading')
    return <MistakeBookState copy="正在整理低分评价与训练证据…" />;
  if (source.state.status === 'error') {
    return (
      <MistakeBookState copy="错题本暂时未能读取，已保存的评价不会丢失。" onRetry={source.reload} />
    );
  }
  return (
    <MistakeBookContent
      book={source.state.book}
      startingId={review.startingId}
      onStart={(mistakeId) => void review.start(mistakeId)}
      returnedFromReview={returnedFromReview}
    />
  );
}

function useMistakeBookData() {
  const [state, setState] = useState<MistakeState>({ status: 'loading' });
  const [request, setRequest] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void listPracticeMistakes()
      .then((book) => {
        if (active) setState({ status: 'ready', book });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [request]);
  return { state, reload: () => setRequest((value) => value + 1) };
}

function useMistakeReview() {
  const [startingId, setStartingId] = useState<string | null>(null);
  const notifications = useNotifications();
  const router = useRouter();
  const start = async (mistakeId: string) => {
    setStartingId(mistakeId);
    try {
      const session = await startMistakeReview(mistakeId);
      notifications.success('错题复练已创建', '这道题仍处于可训练状态，即将进入答题页。');
      router.push(mistakeBookReviewHref(session.id));
    } catch (error) {
      notifications.error(
        '这道错题暂时不能复练',
        error,
        '题目可能已下架；历史评价和证据仍会保留。',
      );
    } finally {
      setStartingId(null);
    }
  };
  return { startingId, start };
}

function useMistakeBookReturnFocus(status: MistakeState['status']) {
  const [returnedFromReview, setReturnedFromReview] = useState(false);
  useEffect(() => setReturnedFromReview(isMistakeBookReturnHash(window.location.hash)), []);
  useEffect(() => {
    if (!returnedFromReview || status !== 'ready') return;
    const heading = document.getElementById(MISTAKE_BOOK_RETURN_ANCHOR_ID);
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [returnedFromReview, status]);
  return returnedFromReview;
}

export function mistakeBookReviewHref(sessionId: string) {
  return mistakeBookReviewPracticeHref(sessionId);
}

export function MistakeBookContent({
  book,
  startingId,
  onStart,
  returnedFromReview = false,
}: {
  book: MistakeBookData;
  startingId: string | null;
  onStart: (mistakeId: string) => void;
  returnedFromReview?: boolean;
}) {
  if (!book.items.length) {
    return (
      <section className="mistake-book mistake-book-empty" aria-labelledby="mistake-book-heading">
        <span>错题证据</span>
        <h2 id="mistake-book-heading">还没有需要复练的错题</h2>
        <p>完成带 AI 评价的练习后，低分题目会连同证据一起沉淀在这里。</p>
        <Link href="/questions">去自主选题</Link>
      </section>
    );
  }
  return (
    <section className="mistake-book" aria-labelledby="mistake-book-heading">
      <header>
        <div>
          <span>错题证据</span>
          <h2 id={MISTAKE_BOOK_RETURN_ANCHOR_ID} tabIndex={-1}>
            从低分原因开始复练
          </h2>
          {returnedFromReview ? <p role="status">已回到错题本，已刷新复练状态。</p> : null}
        </div>
        <p>{book.total} 条低分评价 · 历史下架题仍可回看</p>
      </header>
      <div className="mistake-book-list">
        {book.items.map((item) => (
          <MistakeBookRow
            key={item.id}
            item={item}
            starting={startingId === item.id}
            onStart={() => onStart(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

function MistakeBookRow({
  item,
  starting,
  onStart,
}: {
  item: MistakeBookItem;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <article className="mistake-book-row" data-reviewable={item.canStartReview}>
      <div className="mistake-book-score" aria-label={`评价得分 ${Math.round(item.score)} 分`}>
        <strong>{Math.round(item.score)}</strong>
        <span>分</span>
      </div>
      <div className="mistake-book-main">
        <small>{DATE_FORMATTER.format(new Date(item.evaluatedAt))} · 低分评价</small>
        <h3>{item.questionSnapshot.title}</h3>
        <p>{item.feedback}</p>
        <MistakeEvidence item={item} />
      </div>
      <div className="mistake-book-action">
        <span>1 题 · 约 {REVIEW_MINUTES_PER_QUESTION} 分钟</span>
        {item.canStartReview ? (
          <button type="button" disabled={starting} onClick={onStart}>
            {starting ? '正在创建…' : '开始这题复练'}
          </button>
        ) : (
          <em>题目已下架，仅保留历史回看</em>
        )}
        {item.reviewedAt ? <small>已于 {formatDate(item.reviewedAt)} 复练</small> : null}
      </div>
    </article>
  );
}

function MistakeEvidence({ item }: { item: MistakeBookItem }) {
  return (
    <div className="mistake-evidence" aria-label="推荐依据">
      <span>推荐依据</span>
      <div>
        {item.evidence.length ? (
          item.evidence.map((evidence) => (
            <i key={`${evidence.tag}-${evidence.createdAt}`}>{evidence.tag}</i>
          ))
        ) : (
          <i>低分评价</i>
        )}
      </div>
      {item.missingPoints.length ? <p>待补：{item.missingPoints.join('、')}</p> : null}
    </div>
  );
}

function MistakeBookState({ copy, onRetry }: { copy: string; onRetry?: () => void }) {
  return (
    <section className="mistake-book mistake-book-state" aria-live="polite">
      <strong>错题本</strong>
      <p>{copy}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          重新读取
        </button>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(value));
}
