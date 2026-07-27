import type { PracticeItemSolution, PracticeSession } from '@interview-agent/contracts';
import Link from 'next/link';
import { useState } from 'react';
import type { PlayerAiOperation, PlayerBusy, PlayerIssue } from './practice-player-actions';
import { PracticeAiConfirmationDialog } from './PracticeAiConfirmationDialog';
import { PracticeAnswerReview } from './PracticeAnswerReview';
import { PracticeEvaluationResult } from './PracticeEvaluationResult';
import { PracticeLearningNotice } from './PracticeLearningNotice';

export { PracticeLearningNotice } from './PracticeLearningNotice';

type PracticeCoachPanelProps = {
  item: PracticeSession['items'][number];
  draft: string;
  solution: PracticeItemSolution | undefined;
  busy: PlayerBusy;
  issue: PlayerIssue;
  aiOperation: PlayerAiOperation | null;
  confirmAiOnOpen: boolean;
  onRevealSolution: () => void;
  onEvaluate: () => void;
  onOpenReview: () => void;
  onBackToAnswer: () => void;
  hasNextQuestion: boolean;
  onNextQuestion: () => void;
};

export function PracticeCoachPanel(props: PracticeCoachPanelProps) {
  const answerSaved = Boolean(props.item.answer);
  const answerCurrent = answerSaved && props.draft.trim() === props.item.answer?.trim();
  return (
    <article
      className="practice-feedback-stage"
      aria-label="解析与 AI 教练"
      data-user-agent-scope="practice-feedback"
    >
      <header className="practice-feedback-header">
        <div>
          <span>STEP 02 · 本题反馈</span>
          <h1>解析与 AI 评价</h1>
          <p>
            第 {String(props.item.sequence).padStart(2, '0')} 题 · {props.item.question.title}
          </p>
        </div>
        <button type="button" onClick={props.onBackToAnswer}>
          ← 返回修改回答
        </button>
      </header>
      <PracticeAnswerReview
        answer={props.draft}
        answerCurrent={answerCurrent}
        tags={props.item.question.tags}
      />
      <div className="practice-feedback-content">
        <SolutionSection {...props} answerSaved={answerSaved} />
        <AiEvaluationSection {...props} answerCurrent={answerCurrent} />
      </div>
      <PracticeLearningNotice item={props.item} />
      <PracticeFeedbackActions {...props} />
    </article>
  );
}

function SolutionSection(props: PracticeCoachPanelProps & { answerSaved: boolean }) {
  const loading = props.busy === `solution:${props.item.id}`;
  return (
    <section className="practice-coach-section">
      <div className="practice-coach-heading">
        <span>解析</span>
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
  const evaluation = props.item.evaluation;
  const [confirming, setConfirming] = useState(
    Boolean(props.confirmAiOnOpen && props.answerCurrent && !evaluation),
  );
  const evaluating = props.busy === `evaluate:${props.item.id}`;
  return (
    <section className="practice-coach-section ai-section">
      <div className="practice-coach-heading">
        <span>评价</span>
        <strong>AI 评分与追问</strong>
        <i>BYOK</i>
      </div>
      {evaluation ? (
        <PracticeEvaluationResult evaluation={evaluation} />
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
            {evaluating ? '模型评价中…' : '生成本题 AI 评分'}
          </button>
        </div>
      )}
      {confirming ? (
        <PracticeItemAiConfirmation
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

function PracticeItemAiConfirmation({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <PracticeAiConfirmationDialog
      titleId="practice-ai-confirmation-title"
      eyebrow="模型调用确认 · BYOK"
      title="确认生成本题 AI 评价"
      copy="将调用一次你在设置中验证的默认模型，并返回以下反馈："
      benefits={['本题评分', '缺失要点', '针对性追问']}
      securityNote="API Key 仅在本次调用期间从加密存储中解密，不会展示在页面中。"
      cancelLabel="暂不评价"
      confirmLabel="使用我的模型开始评价"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
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

function PracticeFeedbackActions(props: PracticeCoachPanelProps) {
  const canOpenReview = Boolean(props.solution || props.item.evaluation);
  return (
    <footer className="practice-feedback-actions">
      <div>
        <span>{props.hasNextQuestion ? '本题反馈已整理' : '最后一题反馈已整理'}</span>
        <strong>
          {props.hasNextQuestion ? '继续下一题，保持练习节奏。' : '继续下方 STEP 03 完成本轮。'}
        </strong>
      </div>
      <div>
        {canOpenReview ? (
          <button className="secondary" type="button" onClick={props.onOpenReview}>
            查看完整复盘
          </button>
        ) : null}
        {props.hasNextQuestion ? (
          <button type="button" disabled={props.busy !== null} onClick={props.onNextQuestion}>
            进入下一题 →
          </button>
        ) : null}
      </div>
    </footer>
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
