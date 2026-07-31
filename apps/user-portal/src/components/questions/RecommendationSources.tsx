import type { PracticeRecommendation } from '@interview-agent/contracts';

type RecommendationSourcesProps = Pick<PracticeRecommendation, 'algorithm' | 'evidence'>;

export function RecommendationSources({ algorithm, evidence = [] }: RecommendationSourcesProps) {
  if (!evidence.length) return null;
  return (
    <div className="question-agent-sources">
      <span className="question-agent-algorithm">
        {algorithm === 'hybrid' ? '混合检索推荐' : '规则推荐'}
      </span>
      <ul className="question-agent-evidence" aria-label="推荐依据">
        {evidence.map((item) => (
          <li key={`${item.type}:${item.sourceId}`}>
            <strong>{item.type === 'retrieval' ? `检索来源 · ${item.label}` : item.label}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
