'use client';

import { useState } from 'react';
import {
  canCompleteSelfStudy,
  canSubmitAiReport,
  pendingEvaluationCount,
  requiresAiReportConfirmation,
} from './practice-player-model';
import { PracticeAiConfirmationDialog } from './PracticeAiConfirmationDialog';
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
    <section className="practice-round-actions practice-round-completion-step">
      <CompletionSummary pendingCount={pendingCount} submitting={submitting} />
      <div>
        <button
          className="secondary"
          type="button"
          disabled={player.busy !== null}
          onClick={() => void player.completeSelfStudy()}
        >
          {player.busy === 'submit-self' ? '结束中…' : '仅保留回答并结束'}
        </button>
        <button
          type="button"
          disabled={!canSubmitAiReport(session) || player.busy !== null}
          onClick={requestAiReport}
        >
          {submitting ? '生成复盘中…' : '生成整轮 AI 复盘'}
        </button>
      </div>
      {confirming ? (
        <PracticeAiReportConfirmation
          pendingCount={pendingCount}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void player.submitAiReport();
          }}
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
      <span className="practice-round-eyebrow">STEP 03 · 完成本轮</span>
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

export function PracticeAiReportConfirmation({
  pendingCount,
  onCancel,
  onConfirm,
}: {
  pendingCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <PracticeAiConfirmationDialog
      titleId="practice-round-ai-confirmation-title"
      eyebrow="整轮模型调用 · BYOK"
      title="确认生成整轮 AI 复盘"
      copy={`将使用你在设置中验证的默认模型，自动补齐 ${pendingCount} 道未评价题目。`}
      benefits={[`自动评价 ${pendingCount} 题`, '生成整轮总结', '更新能力画像']}
      securityNote="生成完成后会同步薄弱项和能力记录；API Key 仅在调用期间解密。"
      cancelLabel="暂不生成"
      confirmLabel="使用我的模型生成复盘"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
