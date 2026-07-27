import type { PracticeSession } from '@interview-agent/contracts';

type PracticeEvaluation = NonNullable<PracticeSession['items'][number]['evaluation']>;

type EvaluationVerdict = {
  label: string;
  tone: 'strong' | 'steady' | 'developing' | 'priority';
};

const EXCELLENT_SCORE = 90;
const STEADY_SCORE = 75;
const PASSING_SCORE = 60;

export function PracticeEvaluationResult({ evaluation }: { evaluation: PracticeEvaluation }) {
  const score = Math.round(evaluation.score);
  const verdict = evaluationVerdict(score);
  return (
    <div className="practice-evaluation-result">
      <header className="practice-evaluation-summary" data-tone={verdict.tone}>
        <div className="practice-evaluation-score" aria-label={`本题得分 ${score} 分`}>
          <strong>{score}</strong>
          <span>/ 100</span>
        </div>
        <div>
          <span>AI 总评</span>
          <strong>{verdict.label}</strong>
          <p>{evaluation.feedback}</p>
        </div>
      </header>
      <RubricScores scores={evaluation.rubricScores} />
      <MissingPoints points={evaluation.missingPoints} />
      {evaluation.followUpQuestion ? (
        <blockquote>
          <span>Agent 追问</span>
          <strong>{evaluation.followUpQuestion}</strong>
          <small>建议先口述 60 秒，再返回补充回答。</small>
        </blockquote>
      ) : null}
    </div>
  );
}

function RubricScores({ scores }: { scores: PracticeEvaluation['rubricScores'] }) {
  if (!scores.length) return null;
  return (
    <section className="practice-evaluation-rubrics">
      <header>
        <strong>评分维度</strong>
        <span>快速定位优势与短板</span>
      </header>
      <div>
        {scores.map((score) => {
          const value = Math.round(score.score);
          return (
            <article key={score.point}>
              <div>
                <strong>{score.point}</strong>
                <span>{value}</span>
              </div>
              <progress value={value} max={100} aria-label={`${score.point} ${value} 分`} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MissingPoints({ points }: { points: PracticeEvaluation['missingPoints'] }) {
  if (!points.length) return null;
  return (
    <section className="practice-evaluation-gaps">
      <strong>优先补强</strong>
      <ul>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

function evaluationVerdict(score: number): EvaluationVerdict {
  if (score >= EXCELLENT_SCORE) return { label: '表现优秀', tone: 'strong' };
  if (score >= STEADY_SCORE) return { label: '整体扎实', tone: 'steady' };
  if (score >= PASSING_SCORE) return { label: '达到基础要求', tone: 'developing' };
  return { label: '建议重点补强', tone: 'priority' };
}
