'use client';

import { useState } from 'react';
import {
  canCompleteSelfStudy,
  canSubmitAiReport,
  pendingEvaluationCount,
  requiresAiReportConfirmation,
} from './practice-player-model';
import type { usePracticePlayer } from './usePracticePlayer';

type PracticePlayer = ReturnType<typeof usePracticePlayer>;

export function PracticeRoundCompletionBar({ player }: { player: PracticePlayer }) {
  const [confirming, setConfirming] = useState(false);
  const session = player.session;
  if (!session || !canCompleteSelfStudy(session)) return null;
  const pendingCount = pendingEvaluationCount(session);
  const submitting = player.busy === 'submit-ai';
  const requestAiReport = () => {
    if (requiresAiReportConfirmation(session)) setConfirming(true);
    else void player.submitAiReport();
  };

  return (
    <section className="practice-round-actions">
      <CompletionSummary pendingCount={pendingCount} submitting={submitting} />
      <div>
        <button
          className="secondary"
          type="button"
          disabled={player.busy !== null}
          onClick={() => void player.completeSelfStudy()}
        >
          {player.busy === 'submit-self' ? '结束中…' : '结束自学（无 AI 报告）'}
        </button>
        <button
          type="button"
          disabled={!canSubmitAiReport(session) || player.busy !== null}
          onClick={requestAiReport}
        >
          {submitting ? '生成复盘中…' : '生成 AI 复盘'}
        </button>
      </div>
      {confirming ? (
        <AiReportConfirmation
          pendingCount={pendingCount}
          player={player}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </section>
  );
}

function CompletionSummary({
  pendingCount,
  submitting,
}: {
  pendingCount: number;
  submitting: boolean;
}) {
  const copy = pendingCount
    ? `全部回答已保存 · 复盘将自动评价 ${pendingCount} 题`
    : '全部题目已完成 AI 评价';
  return (
    <div>
      <strong>{copy}</strong>
      <p>
        {pendingCount
          ? '生成前会确认模型额度消耗；也可继续逐题评价后再复盘。'
          : '可以直接生成整轮 AI 复盘，并把薄弱项同步到下一轮推荐。'}
      </p>
      {submitting ? (
        <p className="practice-report-operation" role="status">
          <span aria-hidden="true" />
          正在补齐题目评价、生成整轮复盘并更新能力记录，请不要关闭页面…
        </p>
      ) : null}
    </div>
  );
}

function AiReportConfirmation({
  pendingCount,
  player,
  onCancel,
}: {
  pendingCount: number;
  player: PracticePlayer;
  onCancel: () => void;
}) {
  return (
    <section className="practice-ai-confirmation" aria-live="polite">
      <div>
        <span>额度确认</span>
        <strong>确认生成本轮 AI 复盘</strong>
        <p>{`将自动评价 ${pendingCount} 道已保存题目，并使用你在设置中验证的默认模型。`}</p>
      </div>
      <div className="practice-ai-confirmation-actions">
        <button className="secondary" type="button" onClick={onCancel}>
          暂不生成
        </button>
        <button type="button" onClick={() => void player.submitAiReport()}>
          开始生成复盘
        </button>
      </div>
    </section>
  );
}
