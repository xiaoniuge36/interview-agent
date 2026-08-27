import type { CSSProperties } from 'react';
import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import Link from 'next/link';
import { PracticeReportPanel } from '../PracticeReportPanel';
import { hasReviewableWeakness } from '@/lib/weakness-review';
import { PracticeCourseRecommendation } from './PracticeCourseRecommendation';
import { PracticeEvidenceStrip } from './PracticeEvidenceStrip';
import { practiceReturnHref, type PracticeReturnOrigin } from './practice-return-origin';

const EVIDENCE_RISE_DELAY = { '--rise-delay': '140ms' } as CSSProperties;
const REVIEW_LIST_RISE_DELAY = { '--rise-delay': '240ms' } as CSSProperties;

type PracticeCompletionPanelProps = {
  session: PracticeSession;
  report: PracticeReport | null;
  mastery: MasteryProfile[];
  message: string;
  onRetry: () => void;
  onReviewItem: (itemId: string) => void;
  onStartNextRecommendation: () => void;
  startingNextRecommendation: boolean;
  onStartWeaknessReview: () => void;
  startingWeaknessReview: boolean;
  returnOrigin?: PracticeReturnOrigin;
};

export function PracticeCompletionPanel(props: PracticeCompletionPanelProps) {
  const aiCompleted = props.session.status === 'report_ready';
  const reportAvailable = aiCompleted && props.report !== null;
  const reviewWeakness = reportAvailable ? hasReviewableWeakness(props.report!) : false;
  const returnToLearning = canReturnToLearning({
    origin: props.returnOrigin ?? null,
    session: props.session,
  });
  const returnToMistakeBook = canReturnToMistakeBook({
    origin: props.returnOrigin ?? null,
    session: props.session,
    reportAvailable,
  });
  return (
    <div className="practice-completion-page">
      <CompletionHeader
        aiCompleted={aiCompleted}
        reportAvailable={reportAvailable}
        reviewWeakness={reviewWeakness}
        returnToLearning={returnToLearning}
        returnToMistakeBook={returnToMistakeBook}
        {...props}
      />
      <CompletionEvidence
        session={props.session}
        aiCompleted={aiCompleted}
        reportAvailable={reportAvailable}
        reviewWeakness={reviewWeakness}
        returnToLearning={returnToLearning}
        returnToMistakeBook={returnToMistakeBook}
      />
      {reportAvailable ? (
        <PracticeReportPanel report={props.report!} mastery={props.mastery} />
      ) : null}
      <CompletedQuestionList session={props.session} onReviewItem={props.onReviewItem} />
      {props.message ? <p className="practice-completion-message">{props.message}</p> : null}
    </div>
  );
}

function CompletionEvidence({
  session,
  aiCompleted,
  reportAvailable,
  reviewWeakness,
  returnToLearning,
  returnToMistakeBook,
}: {
  session: PracticeSession;
  aiCompleted: boolean;
  reportAvailable: boolean;
  reviewWeakness: boolean;
  returnToLearning: boolean;
  returnToMistakeBook: boolean;
}) {
  return (
    <section
      className="practice-completion-evidence motion-rise"
      style={EVIDENCE_RISE_DELAY}
      aria-label="本轮训练证据"
    >
      <PracticeEvidenceStrip session={session} reportAvailable={reportAvailable} />
      <div className="practice-completion-next-step">
        <span>下一步</span>
        <strong>
          {nextStepTitle({
            aiCompleted,
            reportAvailable,
            reviewWeakness,
            returnToLearning,
            returnToMistakeBook,
          })}
        </strong>
        <p>
          {nextStepDescription({
            aiCompleted,
            reportAvailable,
            reviewWeakness,
            returnToLearning,
            returnToMistakeBook,
          })}
        </p>
        {reportAvailable ? <PracticeCourseRecommendation session={session} /> : null}
      </div>
    </section>
  );
}

function CompletedQuestionList({
  session,
  onReviewItem,
}: {
  session: PracticeSession;
  onReviewItem: (itemId: string) => void;
}) {
  return (
    <section
      className="practice-completion-review-list motion-rise"
      style={REVIEW_LIST_RISE_DELAY}
      aria-labelledby="practice-completion-review-heading"
    >
      <div>
        <span>逐题回看</span>
        <h2 id="practice-completion-review-heading">回到每道题的回答与反馈</h2>
      </div>
      <div className="motion-stagger">
        {session.items.map((item) => (
          <button key={item.id} type="button" onClick={() => onReviewItem(item.id)}>
            <span>{item.sequence}</span>
            <strong>{item.question.title}</strong>
            <small>
              {item.evaluation ? `AI ${Math.round(item.evaluation.score)} 分` : '已保存回答'}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function CompletionHeader(
  props: PracticeCompletionPanelProps & {
    aiCompleted: boolean;
    reportAvailable: boolean;
    reviewWeakness: boolean;
    returnToLearning: boolean;
    returnToMistakeBook: boolean;
  },
) {
  return (
    <header className="motion-rise">
      <span>{props.aiCompleted ? 'AI review complete' : 'Self-study complete'}</span>
      <h1>{completionTitle(props.aiCompleted, props.reportAvailable)}</h1>
      <p>{completionDescription(props.aiCompleted, props.reportAvailable)}</p>
      <div>
        {props.returnToLearning ? (
          <Link
            className="practice-completion-return"
            href={practiceReturnHref(props.returnOrigin ?? null)!}
          >
            回到原课程继续学习
          </Link>
        ) : props.returnToMistakeBook ? (
          <Link className="practice-completion-return" href={practiceReturnHref('mistake-book')!}>
            回到错题本确认复练状态
          </Link>
        ) : (
          <>
            {props.aiCompleted ? (
              props.reportAvailable ? (
                <NextPracticeButton {...props} />
              ) : (
                <ReportRetryButton onRetry={props.onRetry} />
              )
            ) : null}
            {props.aiCompleted ? <CompletionReturnLink session={props.session} /> : null}
            <Link href="/questions">开始新的题单</Link>
            <Link href="/home">返回题库大厅</Link>
          </>
        )}
      </div>
    </header>
  );
}

function CompletionReturnLink({ session }: { session: PracticeSession }) {
  if (session.mode === 'interview_review' && session.sourceInterviewSessionId) {
    const sourceSessionId = encodeURIComponent(session.sourceInterviewSessionId);
    const practiceSessionId = encodeURIComponent(session.id);
    return (
      <Link
        href={`/interview?session=${sourceSessionId}&reviewPractice=${practiceSessionId}#interview-review-evidence`}
      >
        回看来源面试复盘
      </Link>
    );
  }
  return <Link href="/interview">用模拟面试检验本轮提升</Link>;
}

function NextPracticeButton(props: PracticeCompletionPanelProps & { reviewWeakness: boolean }) {
  const starting = props.reviewWeakness
    ? props.startingWeaknessReview
    : props.startingNextRecommendation;
  return (
    <button
      type="button"
      disabled={starting}
      onClick={props.reviewWeakness ? props.onStartWeaknessReview : props.onStartNextRecommendation}
    >
      {starting ? '正在准备下一轮…' : props.reviewWeakness ? '复练薄弱项' : '按最新推荐开始下一轮'}
    </button>
  );
}

function nextStepTitle(state: {
  aiCompleted: boolean;
  reportAvailable: boolean;
  reviewWeakness: boolean;
  returnToLearning: boolean;
  returnToMistakeBook: boolean;
}) {
  if (state.returnToLearning) return '回到原课程继续学习';
  if (state.returnToMistakeBook) return '回到错题本确认这次复练状态';
  if (!state.aiCompleted) return '选择新的题目继续训练';
  if (!state.reportAvailable) return '先恢复本轮复盘';
  return state.reviewWeakness ? '先复练本轮薄弱项' : '按最新推荐开始下一轮';
}

function nextStepDescription(state: {
  aiCompleted: boolean;
  reportAvailable: boolean;
  reviewWeakness: boolean;
  returnToLearning: boolean;
  returnToMistakeBook: boolean;
}) {
  if (state.returnToLearning) return '本轮仍保留开始时的课程上下文，可返回原课程继续学习。';
  if (state.returnToMistakeBook) return '本题的复练证据已保存，回到错题本可确认已复练标记。';
  if (!state.aiCompleted) return '回答已保留；完成整轮 AI 复盘前不会更新能力画像。';
  if (!state.reportAvailable)
    return '报告内容暂时不可读；恢复后可查看逐题证据和错题，再决定下一轮。';
  return state.reviewWeakness
    ? '本轮低分题已整理为可立即执行的复练入口。'
    : '本轮复盘已汇总为可复用的训练证据。';
}

function ReportRetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button className="practice-report-retry" type="button" onClick={onRetry}>
      重新加载本轮复盘
    </button>
  );
}

function canReturnToMistakeBook(input: {
  origin: PracticeReturnOrigin;
  session: PracticeSession;
  reportAvailable: boolean;
}) {
  if (input.origin !== 'mistake-book') return false;
  return input.session.status === 'submitted' || input.reportAvailable;
}

function canReturnToLearning(input: { origin: PracticeReturnOrigin; session: PracticeSession }) {
  return input.session.mode !== 'interview_review' && learningReturnOrigin(input.origin) !== null;
}

function learningReturnOrigin(origin: PracticeReturnOrigin) {
  return typeof origin === 'object' && origin?.status === 'ready' ? origin : null;
}

function completionTitle(aiCompleted: boolean, reportAvailable: boolean) {
  if (!aiCompleted) return '本轮自学已结束';
  return reportAvailable ? '本轮 AI 复盘已生成' : '正在恢复本轮 AI 复盘';
}

function completionDescription(aiCompleted: boolean, reportAvailable: boolean) {
  if (!aiCompleted) return '本轮没有生成 AI 分数和 mastery 记录，你的回答仍已安全保留。';
  return reportAvailable
    ? '逐题评价已汇总为能力记录，并会影响下一次 Agent 推荐。'
    : '正在重新读取报告内容；恢复后再查看本轮证据和错题。';
}
