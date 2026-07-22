import type { PracticeItemSolution, PracticeSession } from '@interview-agent/contracts';
import Link from 'next/link';
import { useState } from 'react';
import type { PlayerAiOperation, PlayerBusy, PlayerIssue } from './practice-player-actions';

type PracticeCoachPanelProps = {
  item: PracticeSession['items'][number];
  draft: string;
  solution: PracticeItemSolution | undefined;
  busy: PlayerBusy;
  issue: PlayerIssue;
  aiOperation: PlayerAiOperation | null;
  onRevealSolution: () => void;
  onEvaluate: () => void;
  onOpenReview: () => void;
};

export function PracticeCoachPanel(props: PracticeCoachPanelProps) {
  const answerSaved = Boolean(props.item.answer);
  const answerCurrent = answerSaved && props.draft.trim() === props.item.answer?.trim();
  return (
    <aside
      className="practice-coach-panel"
      aria-label="解析与 AI 教练"
      data-user-agent-scope="practice-feedback"
    >
      <header>
        <span>答题教练</span>
        <h2>解析与反馈</h2>
      </header>
      <SolutionSection {...props} answerSaved={answerSaved} />
      <AiEvaluationSection {...props} answerCurrent={answerCurrent} />
      {props.solution || props.item.evaluation ? (
        <button
          className="practice-coach-review-trigger"
          type="button"
          onClick={props.onOpenReview}
        >
          打开本题复盘
        </button>
      ) : null}
      <PracticeLearningNotice item={props.item} />
    </aside>
  );
}

export function PracticeLearningNotice({ item }: Pick<PracticeCoachPanelProps, 'item'>) {
  const focus = item.question.tags.slice(0, 2).join('、') || '相关能力';
  const evaluated = Boolean(item.evaluation);
  const copy = evaluated
    ? `完成整轮 AI 复盘后，会把本题的 ${focus} 证据写入能力画像，并用于下一轮推荐。`
    : `保存回答并完成 AI 评价后，系统会在整轮 AI 复盘时更新你的 ${focus} 能力画像。`;

  return (
    <section className="practice-learning-notice" data-state={evaluated ? 'ready' : 'pending'}>
      <div>
        <span>Agent 学习轨迹</span>
        <strong>{evaluated ? '本题反馈已就绪' : '等待本题 AI 评价'}</strong>
      </div>
      <p>{copy}</p>
    </section>
  );
}

function SolutionSection(props: PracticeCoachPanelProps & { answerSaved: boolean }) {
  const loading = props.busy === `solution:${props.item.id}`;
  return (
    <section className="practice-coach-section">
      <div className="practice-coach-heading">
        <span>01</span>
        <strong>标准解析</strong>
      </div>
      {props.solution ? (
        <div className="practice-solution-content">
          <p>{props.solution.referenceAnswer}</p>
          <div className="practice-rubric-list">
            {props.solution.rubric.map((rubric) => (
              <div key={rubric.point}>
                <strong>{rubric.point}</strong>
                <span>{rubric.description}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="practice-coach-locked">
          <p>
            {props.answerSaved
              ? '回答已保存，可以展开标准答案与评分点。'
              : '先保存你的回答，再查看标准解析。'}
          </p>
          <button
            type="button"
            disabled={!props.answerSaved || props.busy !== null}
            onClick={props.onRevealSolution}
          >
            {loading ? '加载解析中…' : '查看标准解析'}
          </button>
        </div>
      )}
    </section>
  );
}

function AiEvaluationSection(props: PracticeCoachPanelProps & { answerCurrent: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const evaluation = props.item.evaluation;
  const evaluating = props.busy === `evaluate:${props.item.id}`;
  return (
    <section className="practice-coach-section ai-section">
      <div className="practice-coach-heading">
        <span>02</span>
        <strong>真实 AI 评价</strong>
        <i>BYOK</i>
      </div>
      {evaluation ? (
        <EvaluationResult evaluation={evaluation} />
      ) : evaluating ? (
        <AiEvaluationProgress stream={props.aiOperation} />
      ) : (
        <div className="practice-ai-ready">
          <p>
            {props.answerCurrent
              ? '将使用你在设置中验证的默认模型。API Key 只从加密存储中解密用于本次调用。'
              : '保存当前回答后，才能请求 AI 评分与针对性追问。'}
          </p>
          <button
            type="button"
            disabled={!props.answerCurrent || props.busy !== null}
            onClick={() => setConfirming(true)}
          >
            {evaluating ? '模型评价中…' : '调用我的模型评价'}
          </button>
        </div>
      )}
      {confirming ? (
        <AiEvaluationConfirmation
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            props.onEvaluate();
          }}
        />
      ) : null}
      {props.issue ? <CoachIssue issue={props.issue} /> : null}
    </section>
  );
}

function AiEvaluationConfirmation({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <section className="practice-item-ai-confirmation" aria-live="polite">
      <strong>确认调用 AI 评价</strong>
      <p>将使用你在设置中验证的默认模型，生成本题评分、缺失要点与追问。</p>
      <div>
        <button className="secondary" type="button" onClick={onCancel}>
          暂不评价
        </button>
        <button type="button" onClick={onConfirm}>
          开始评价
        </button>
      </div>
    </section>
  );
}

const PHASE_LABELS = {
  preparing: '正在连接你的默认模型',
  analyzing: '正在提取回答中的有效信息',
  composing: '正在组织评价正文',
  validating: '正在核对模型返回结果',
  saving: '正在保存本题评价',
} as const;

function AiEvaluationProgress({ stream }: { stream: PlayerAiOperation | null }) {
  const label = stream?.phase ? PHASE_LABELS[stream.phase] : '正在准备 AI 评价';
  return (
    <div className="practice-ai-stream" aria-live="polite">
      <div className="practice-ai-stream-status">
        <span aria-hidden="true" />
        {label}
      </div>
      {stream?.visibleText ? (
        <p>{stream.visibleText}</p>
      ) : (
        <p>你的评分和追问会在结果校验并保存后出现。</p>
      )}
    </div>
  );
}

function EvaluationResult({
  evaluation,
}: {
  evaluation: NonNullable<PracticeSession['items'][number]['evaluation']>;
}) {
  return (
    <div className="practice-evaluation-result">
      <div className="practice-evaluation-score">
        <strong>{Math.round(evaluation.score)}</strong>
        <span>本题得分</span>
      </div>
      <p>{evaluation.feedback}</p>
      {evaluation.missingPoints.length ? (
        <div>
          <strong>回答还缺少</strong>
          <ul>
            {evaluation.missingPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {evaluation.rubricScores.length ? (
        <div className="practice-rubric-scores">
          {evaluation.rubricScores.map((score) => (
            <span key={score.point}>
              <b>{score.point}</b>
              <i>{Math.round(score.score)}</i>
            </span>
          ))}
        </div>
      ) : null}
      {evaluation.followUpQuestion ? (
        <blockquote>
          <span>Agent 追问</span>
          {evaluation.followUpQuestion}
        </blockquote>
      ) : null}
    </div>
  );
}

function CoachIssue({ issue }: { issue: NonNullable<PlayerIssue> }) {
  const needsConnection = issue.code === 'MODEL_CONNECTION_REQUIRED';
  return (
    <div className="practice-coach-issue" role="alert">
      <strong>{needsConnection ? '还没有可用的 AI 连接' : '本次 AI 评价未完成'}</strong>
      <p>{issue.message}</p>
      {needsConnection ? <Link href="/settings">连接并测试模型 →</Link> : null}
    </div>
  );
}
