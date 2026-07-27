import type { PracticeRecommendation } from '@interview-agent/contracts';
import Link from 'next/link';

type QuestionRecommendationBannerProps = {
  agentHandoff: boolean;
  recommendation: PracticeRecommendation | null;
  loading: boolean;
  error: string;
  starting: boolean;
  selfPickerExpanded: boolean;
  onRetry: () => void;
  onStart: (recommendation: PracticeRecommendation) => void;
  onOpenSelfPicker: () => void;
};

export function QuestionRecommendationBanner(props: QuestionRecommendationBannerProps) {
  const {
    agentHandoff,
    recommendation,
    loading,
    error,
    starting,
    selfPickerExpanded,
    onRetry,
    onStart,
    onOpenSelfPicker,
  } = props;
  return (
    <section className="question-agent-banner" aria-labelledby="question-agent-heading">
      <span className="question-agent-mark" aria-hidden="true">
        <SparkIcon />
      </span>
      <RecommendationContent
        agentHandoff={agentHandoff}
        recommendation={recommendation}
        loading={loading}
        error={error}
      />
      <RecommendationAction
        recommendation={recommendation}
        starting={starting}
        error={error}
        selfPickerExpanded={selfPickerExpanded}
        onRetry={onRetry}
        onStart={onStart}
        onOpenSelfPicker={onOpenSelfPicker}
      />
    </section>
  );
}

function RecommendationContent({
  agentHandoff,
  recommendation,
  loading,
  error,
}: {
  agentHandoff: boolean;
  recommendation: PracticeRecommendation | null;
  loading: boolean;
  error: string;
}) {
  if (loading)
    return (
      <div>
        <span>今天优先练什么</span>
        <h2 id="question-agent-heading">读取你的最新训练线索…</h2>
        <AgentHandoffNotice visible={agentHandoff} />
        <p>推荐生成不会影响题库筛选。</p>
      </div>
    );
  if (recommendation)
    return (
      <div>
        <span>今天优先练什么 · {sourceLabel(recommendation.source)}</span>
        <h2 id="question-agent-heading">{recommendation.title}</h2>
        <AgentHandoffNotice visible={agentHandoff} />
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
      <span>今天优先练什么</span>
      <h2 id="question-agent-heading">本次没有需要优先补强的新题</h2>
      <AgentHandoffNotice visible={agentHandoff} />
      <p>{error || '完成一轮评价后，Agent 会重新计算。'}</p>
    </div>
  );
}

function AgentHandoffNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p className="question-agent-handoff" role="status">
      AI 刷题教练已为你带到推荐训练入口；确认采用后才会创建本轮题单。
    </p>
  );
}

function RecommendationAction(props: {
  recommendation: PracticeRecommendation | null;
  starting: boolean;
  error: string;
  selfPickerExpanded: boolean;
  onRetry: () => void;
  onStart: (recommendation: PracticeRecommendation) => void;
  onOpenSelfPicker: () => void;
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
        <SelfPickerButton expanded={props.selfPickerExpanded} onOpen={props.onOpenSelfPicker} />
        <small>档案和岗位只影响推荐，不限制自主刷题</small>
      </div>
    );
  if (props.error)
    return (
      <div className="question-agent-actions">
        <SelfPickerButton
          primary
          expanded={props.selfPickerExpanded}
          onOpen={props.onOpenSelfPicker}
        />
        <button className="question-agent-retry" type="button" onClick={props.onRetry}>
          重新获取推荐
        </button>
      </div>
    );
  return (
    <div className="question-agent-actions">
      <SelfPickerButton
        primary
        expanded={props.selfPickerExpanded}
        onOpen={props.onOpenSelfPicker}
      />
      <Link className="question-agent-profile-link" href="/profile">
        完善 Agent 档案
      </Link>
    </div>
  );
}

function SelfPickerButton({
  expanded,
  onOpen,
  primary = false,
}: {
  expanded: boolean;
  onOpen: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={primary ? 'question-self-picker-toggle primary' : 'question-self-picker-toggle'}
      type="button"
      aria-expanded={expanded}
      aria-controls={expanded ? 'self-picker-workspace' : undefined}
      onClick={onOpen}
    >
      自己组一轮
    </button>
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
