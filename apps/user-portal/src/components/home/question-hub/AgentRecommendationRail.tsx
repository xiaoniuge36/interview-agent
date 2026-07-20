import type { PracticeRecommendation } from '@interview-agent/contracts';
import Link from 'next/link';

type AgentRecommendationRailProps = {
  recommendations: PracticeRecommendation[];
  loading: boolean;
  error: string;
  actionError: string;
  busyRecommendationId: string | null;
  onRetry: () => void;
  onStart: (recommendation: PracticeRecommendation) => void;
};

export function AgentRecommendationRail(props: AgentRecommendationRailProps) {
  const { actionError } = props;
  return (
    <aside className="agent-recommendation-rail" aria-labelledby="agent-recommendation-heading">
      <header className="agent-rail-header">
        <span className="agent-status-dot" aria-hidden="true" />
        <div>
          <span>OfferPilot Agent · 在线推荐</span>
          <h2 id="agent-recommendation-heading">为你整理的下一组题</h2>
        </div>
      </header>
      <RailPrimaryContent {...props} />
      {actionError ? (
        <p className="agent-action-error" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="agent-rail-note">
        <strong>推荐如何变化？</strong>
        <p>修改档案、目标岗位或完成一次 AI 评价后，下次进入会自动重新计算。</p>
        <Link href="/profile">
          完善我的 Agent 档案 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}

function RailPrimaryContent(props: AgentRecommendationRailProps) {
  const { recommendations, loading, error, busyRecommendationId, onRetry, onStart } = props;
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
        <p>推荐生成不会影响左侧题库，你可以先自主选择。</p>
      </div>
    );
  return (
    <div className="agent-rail-empty">
      <strong>本次没有需要优先补强的新题</strong>
      <p>你可以从公共题库自由组合题单；完成新一轮评价后，Agent 会再次计算。</p>
      <Link href="/questions">前往自主选题 →</Link>
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
        {busy ? '正在创建题单…' : '采用这组题开始练习'}
      </button>
      <Link href="/questions">我想自己选题</Link>
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
    </div>
  );
}

function sourceLabel(source: PracticeRecommendation['source']) {
  if (source === 'mastery') return '能力弱项强化';
  if (source === 'job') return '目标岗位匹配';
  if (source === 'profile') return '个人档案匹配';
  return '通用精选';
}
