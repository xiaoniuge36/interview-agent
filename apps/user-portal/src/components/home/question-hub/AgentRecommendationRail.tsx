import type { PracticeRecommendation } from '@interview-agent/contracts';
import Link from 'next/link';
import { HomeWelcome } from './HomeWelcome';
import { TrainingContinuationCard } from './TrainingContinuationCard';
import type { TrainingContinuation } from './training-continuation';
import { ActionLabel } from '@/components/consumer/ActionLabel';
import { SignalField } from '@/components/consumer/SignalField';

type AgentRecommendationRailProps = {
  displayName?: string | null | undefined;
  continuation?: TrainingContinuation | null;
  recommendations: PracticeRecommendation[];
  loading: boolean;
  error: string;
  actionError: string;
  busyRecommendationId: string | null;
  onRetry: () => void;
  onStart: (recommendation: PracticeRecommendation) => void;
};

export function AgentRecommendationRail(props: AgentRecommendationRailProps) {
  const { actionError, continuation, displayName } = props;
  return (
    <section className="home-training-plan" aria-labelledby="home-training-plan-heading">
      <header className="home-training-plan-header">
        <HomeWelcome displayName={displayName} continuation={continuation ?? null} />
      </header>
      <RailPrimaryContent {...props} />
      {actionError ? (
        <p className="agent-action-error" role="alert">
          {actionError}
        </p>
      ) : null}
      <footer className="agent-rail-note">
        <strong>推荐如何变化？</strong>
        <p>修改档案、目标岗位或完成一次 AI 评价后，下次进入会自动重新计算。</p>
        <Link href="/profile">
          完善我的 Agent 档案 <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </section>
  );
}

function RailPrimaryContent(props: AgentRecommendationRailProps) {
  const { continuation, recommendations, loading, error, busyRecommendationId, onRetry, onStart } =
    props;
  if (continuation) return <TrainingContinuationCard continuation={continuation} />;
  const recommendation = recommendations[0];
  if (recommendation)
    return (
      <RecommendationCard
        recommendation={recommendation}
        busy={busyRecommendationId === recommendation.id}
        onStart={() => onStart(recommendation)}
      />
    );
  if (error) return <RailError message={error} onRetry={onRetry} />;
  if (loading)
    return (
      <div className="agent-rail-empty">
        <span className="agent-thinking" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>正在读取你的最新训练线索</strong>
        <p>推荐生成不会阻塞训练；你随时可以先按自己的节奏组题。</p>
        <Link className="agent-self-picker-link" href="/questions">
          自己组一轮
        </Link>
      </div>
    );
  return (
    <div className="agent-rail-empty">
      <strong>本次没有需要优先补强的新题</strong>
      <p>你可以从公共题库自由组合题单；完成新一轮评价后，Agent 会再次计算。</p>
      <Link className="agent-self-picker-link" href="/questions">
        自己组一轮
      </Link>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  busy,
  onStart,
}: {
  recommendation: PracticeRecommendation;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <article className="agent-recommendation-card">
      <SignalField />
      <div className="agent-recommendation-meta">
        <span>{sourceLabel(recommendation.source)}</span>
        <span>
          {recommendation.questionIds.length} 题 · 约 {recommendation.estimatedMinutes} 分钟
        </span>
      </div>
      <h3>{recommendation.title}</h3>
      <div className="agent-reason">
        <span>本轮训练依据</span>
        <p>{recommendation.reason}</p>
      </div>
      <button type="button" onClick={onStart} disabled={busy}>
        <ActionLabel
          label="采用这组题开始练习"
          busy={busy}
          busyLabel="正在创建题单…"
        />
      </button>
      <Link className="agent-self-picker-link" href="/questions">
        自己组一轮
      </Link>
    </article>
  );
}

function RailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="agent-rail-error" role="status">
      <strong>推荐没有打断你的训练</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        重新获取推荐
      </button>
      <Link className="agent-self-picker-link" href="/questions">
        自己组一轮
      </Link>
    </div>
  );
}

function sourceLabel(source: PracticeRecommendation['source']) {
  if (source === 'mastery') return '能力弱项强化';
  if (source === 'job') return '目标岗位匹配';
  if (source === 'profile') return '个人档案匹配';
  return '通用精选';
}
