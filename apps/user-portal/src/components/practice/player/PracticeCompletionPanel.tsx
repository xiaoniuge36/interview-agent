import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import Link from 'next/link';
import { PracticeReportPanel } from '../PracticeReportPanel';
import { hasReviewableWeakness } from '@/lib/weakness-review';
import { PracticeEvidenceStrip } from './PracticeEvidenceStrip';

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
};

export function PracticeCompletionPanel(props: PracticeCompletionPanelProps) {
  const aiCompleted = props.session.status === 'report_ready';
  const hasReport = aiCompleted && props.report;
  const reviewWeakness = hasReport ? hasReviewableWeakness(props.report) : false;
  return (
    <div className="practice-completion-page">
      <CompletionHeader aiCompleted={aiCompleted} reviewWeakness={reviewWeakness} {...props} />
      <CompletionEvidence
        session={props.session}
        aiCompleted={aiCompleted}
        reviewWeakness={reviewWeakness}
      />
      {hasReport ? <PracticeReportPanel report={props.report!} mastery={props.mastery} /> : null}
      <CompletedQuestionList session={props.session} onReviewItem={props.onReviewItem} />
      <ReportRetry aiCompleted={aiCompleted} report={props.report} onRetry={props.onRetry} />
      {props.message ? <p className="practice-completion-message">{props.message}</p> : null}
    </div>
  );
}

function CompletionEvidence({
  session,
  aiCompleted,
  reviewWeakness,
}: {
  session: PracticeSession;
  aiCompleted: boolean;
  reviewWeakness: boolean;
}) {
  return (
    <section className="practice-completion-evidence" aria-label="本轮训练证据">
      <PracticeEvidenceStrip session={session} />
      <div className="practice-completion-next-step">
        <span>下一步</span>
        <strong>{nextStepTitle({ aiCompleted, reviewWeakness })}</strong>
        <p>{nextStepDescription({ aiCompleted, reviewWeakness })}</p>
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
      className="practice-completion-review-list"
      aria-labelledby="practice-completion-review-heading"
    >
      <div>
        <span>逐题回看</span>
        <h2 id="practice-completion-review-heading">回到每道题的回答与反馈</h2>
      </div>
      <div>
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
  props: PracticeCompletionPanelProps & { aiCompleted: boolean; reviewWeakness: boolean },
) {
  return (
    <header>
      <span>{props.aiCompleted ? 'AI review complete' : 'Self-study complete'}</span>
      <h1>{props.aiCompleted ? '本轮 AI 复盘已生成' : '本轮自学已结束'}</h1>
      <p>{completionDescription(props.aiCompleted)}</p>
      <div>
        {props.aiCompleted ? <NextPracticeButton {...props} /> : null}
        {props.aiCompleted ? <Link href="/interview">用模拟面试检验本轮提升</Link> : null}
        <Link href="/questions">开始新的题单</Link>
        <Link href="/home">返回题库大厅</Link>
      </div>
    </header>
  );
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

function nextStepTitle(state: { aiCompleted: boolean; reviewWeakness: boolean }) {
  if (!state.aiCompleted) return '选择新的题目继续训练';
  return state.reviewWeakness ? '先复练本轮薄弱项' : '按最新推荐开始下一轮';
}

function nextStepDescription(state: { aiCompleted: boolean; reviewWeakness: boolean }) {
  if (!state.aiCompleted) return '回答已保留；完成整轮 AI 复盘前不会更新能力画像。';
  return state.reviewWeakness
    ? '本轮低分题已整理为可立即执行的复练入口。'
    : '本轮复盘已汇总为可复用的训练证据。';
}

function ReportRetry({
  aiCompleted,
  report,
  onRetry,
}: {
  aiCompleted: boolean;
  report: PracticeReport | null;
  onRetry: () => void;
}) {
  if (!aiCompleted || report) return null;
  return (
    <div className="practice-report-retry" role="status">
      <p>正在重新读取报告内容，能力记录已经完成同步。</p>
      <button type="button" onClick={onRetry}>
        重新加载本轮复盘
      </button>
    </div>
  );
}

function completionDescription(aiCompleted: boolean) {
  return aiCompleted
    ? '逐题评价已汇总为能力记录，并会影响下一次 Agent 推荐。'
    : '本轮没有生成 AI 分数和 mastery 记录，你的回答仍已安全保留。';
}
