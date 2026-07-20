import type { PracticeRecommendation } from '@interview-agent/contracts';
import Link from 'next/link';

type QuestionRecommendationBannerProps = {
  recommendation: PracticeRecommendation | null;
  loading: boolean;
  error: string;
  starting: boolean;
  onRetry: () => void;
  onStart: (recommendation: PracticeRecommendation) => void;
};

export function QuestionRecommendationBanner(props: QuestionRecommendationBannerProps) {
  const { recommendation, loading, error, starting, onRetry, onStart } = props;
  return (
    <section className="question-agent-banner" aria-labelledby="question-agent-heading">
      <span className="question-agent-mark" aria-hidden="true">
        <SparkIcon />
      </span>
      <RecommendationContent recommendation={recommendation} loading={loading} error={error} />
      <RecommendationAction
        recommendation={recommendation}
        starting={starting}
        error={error}
        onRetry={onRetry}
        onStart={onStart}
      />
    </section>
  );
}

function RecommendationContent({
  recommendation,
  loading,
  error,
}: {
  recommendation: PracticeRecommendation | null;
  loading: boolean;
  error: string;
}) {
  if (loading)
    return (
      <div>
        <span>Agent 正在整理</span>
        <h2 id="question-agent-heading">读取你的最新训练线索…</h2>
        <p>推荐生成不会影响题库筛选。</p>
      </div>
    );
  if (recommendation)
    return (
      <div>
        <span>Agent 推荐 · {sourceLabel(recommendation.source)}</span>
        <h2 id="question-agent-heading">{recommendation.title}</h2>
        <div className="question-agent-reason">
          <strong>本轮推荐依据</strong>
          <p>{recommendation.reason}</p>
        </div>
        <div className="question-agent-meta">
          <span>{recommendation.questionIds.length} 道题</span>
          <span>约 {recommendation.estimatedMinutes} 分钟</span>
          <span>按掌握度动态更新</span>
        </div>
      </div>
    );
  return (
    <div>
      <span>Agent 推荐</span>
      <h2 id="question-agent-heading">本次没有需要优先补强的新题</h2>
      <p>{error || '完成一轮评价后，Agent 会重新计算。'}</p>
    </div>
  );
}

function RecommendationAction(props: {
  recommendation: PracticeRecommendation | null;
  starting: boolean;
  error: string;
  onRetry: () => void;
  onStart: (recommendation: PracticeRecommendation) => void;
}) {
  if (props.recommendation)
    return (
      <div className="question-agent-actions">
        <button
          type="button"
          disabled={props.starting}
          onClick={() => props.onStart(props.recommendation!)}
        >
          <SparkIcon />
          {props.starting ? '正在创建…' : '采用并开始训练'}
        </button>
        <small>档案和岗位只影响推荐，不限制自主刷题</small>
      </div>
    );
  if (props.error)
    return (
      <button className="question-agent-retry" type="button" onClick={props.onRetry}>
        重新获取推荐
      </button>
    );
  return (
    <Link className="question-agent-profile-link" href="/profile">
      完善 Agent 档案
    </Link>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </svg>
  );
}

function sourceLabel(source: PracticeRecommendation['source']) {
  if (source === 'mastery') return '能力弱项强化';
  if (source === 'job') return '目标岗位匹配';
  if (source === 'profile') return '个人档案匹配';
  return '通用精选';
}
