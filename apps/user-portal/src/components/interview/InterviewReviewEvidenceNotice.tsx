'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPracticeReport, getPracticeSession } from '@/lib/practice-api';
import {
  buildInterviewReviewEvidence,
  type InterviewReviewEvidence,
} from './interview-review-evidence';

const SAFE_SESSION_ID = /^[A-Za-z0-9_-]{1,160}$/u;

export type InterviewReviewEvidenceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; evidence: InterviewReviewEvidence };

export function InterviewReviewEvidenceNotice({
  interviewSessionId,
}: {
  interviewSessionId: string | null;
}) {
  const rawPracticeSessionId = useSearchParams().get('reviewPractice');
  const practiceSessionId = safeSessionId(rawPracticeSessionId);
  const [retryNonce, setRetryNonce] = useState(0);
  const [state, setState] = useState<InterviewReviewEvidenceState>({ status: 'idle' });
  useEffect(() => {
    if (!practiceSessionId || !interviewSessionId) {
      setState({ status: 'idle' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    void loadInterviewReviewEvidence(practiceSessionId, interviewSessionId).then(
      (evidence) =>
        active && setState(evidence ? { status: 'ready', evidence } : { status: 'missing' }),
      () => active && setState({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, [interviewSessionId, practiceSessionId, retryNonce]);
  if (!practiceSessionId || state.status === 'idle') return null;
  return (
    <InterviewReviewEvidenceDelivery
      state={state}
      practiceSessionId={practiceSessionId}
      onRetry={() => setRetryNonce((value) => value + 1)}
    />
  );
}

export function InterviewReviewEvidenceDelivery({
  state,
  practiceSessionId,
  onRetry,
}: {
  state: Exclude<InterviewReviewEvidenceState, { status: 'idle' }>;
  practiceSessionId: string;
  onRetry: () => void;
}) {
  const panelRef = useEvidenceFocus(state.status);
  if (state.status === 'ready') {
    return <ReadyEvidence state={state} panelRef={panelRef} />;
  }
  return (
    <section
      ref={panelRef}
      id="interview-review-evidence"
      className="panel interview-review-return-evidence"
      tabIndex={-1}
      role={state.status === 'error' ? 'alert' : 'status'}
    >
      <strong>{evidenceStateTitle(state.status)}</strong>
      <p>{evidenceStateDetail(state.status)}</p>
      {state.status === 'error' ? (
        <button className="button secondary" type="button" onClick={onRetry}>
          重新读取
        </button>
      ) : null}
      {state.status === 'missing' ? (
        <Link className="button secondary" href={`/practice?session=${practiceSessionId}`}>
          返回本次练习
        </Link>
      ) : null}
    </section>
  );
}

function ReadyEvidence({
  state,
  panelRef,
}: {
  state: Extract<InterviewReviewEvidenceState, { status: 'ready' }>;
  panelRef: ReturnType<typeof useEvidenceFocus>;
}) {
  const evidence = state.evidence;
  return (
    <section
      ref={panelRef}
      id="interview-review-evidence"
      className="panel interview-review-return-evidence"
      tabIndex={-1}
      role="status"
      aria-label="本次专项复练证据"
    >
      <span>专项复练已完成</span>
      <strong>本次复练 {Math.round(evidence.score)} 分</strong>
      <p>已回到来源面试复盘；下面是本次专项复练的真实报告证据。</p>
      <EvidenceList evidence={evidence} />
      <Link className="button secondary" href={`/practice?session=${evidence.practiceSessionId}`}>
        回看本次复练
      </Link>
    </section>
  );
}

function EvidenceList({ evidence }: { evidence: InterviewReviewEvidence }) {
  const items = [
    ...evidence.weaknesses.map((item) => `仍需加强：${item}`),
    ...evidence.nextActions.map((item) => `下一步：${item}`),
  ];
  return items.length ? (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p>本次报告没有额外薄弱项，分数与逐题反馈仍保留在练习记录中。</p>
  );
}

function useEvidenceFocus(status: InterviewReviewEvidenceState['status']) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (status === 'ready' || status === 'missing' || status === 'error') ref.current?.focus();
  }, [status]);
  return ref;
}

async function loadInterviewReviewEvidence(practiceSessionId: string, interviewSessionId: string) {
  const session = await getPracticeSession(practiceSessionId);
  if (
    session.status !== 'report_ready' ||
    session.sourceInterviewSessionId !== interviewSessionId
  ) {
    return null;
  }
  const report = await getPracticeReport(practiceSessionId);
  return buildInterviewReviewEvidence(session, interviewSessionId, report);
}

function safeSessionId(value: string | null) {
  return value && SAFE_SESSION_ID.test(value) ? value : null;
}

function evidenceStateTitle(status: 'loading' | 'missing' | 'error') {
  if (status === 'loading') return '正在读取本次专项复练证据';
  if (status === 'missing') return '没有找到与来源报告匹配的复练证据';
  return '本次复练证据暂时无法读取';
}

function evidenceStateDetail(status: 'loading' | 'missing' | 'error') {
  if (status === 'loading') return '来源面试复盘已恢复，正在同步这次专项复练的真实结果。';
  if (status === 'missing') return '来源报告仍然保留；可返回本次练习核对状态后再试。';
  return '来源报告与面试对话不会丢失。请重新读取，或稍后从练习记录返回。';
}
