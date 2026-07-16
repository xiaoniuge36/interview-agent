'use client';

import Link from 'next/link';
import { canCompleteSelfStudy, canSubmitAiReport, practiceProgress } from './practice-player-model';
import { PracticeCoachPanel } from './PracticeCoachPanel';
import { PracticeCompletionPanel } from './PracticeCompletionPanel';
import { PracticeQuestionNav } from './PracticeQuestionNav';
import { PracticeQuestionStage } from './PracticeQuestionStage';
import { usePracticePlayer } from './usePracticePlayer';

export function PracticePlayer() {
  const player = usePracticePlayer();
  if (!player.sessionId) return <PracticeEntry />;
  if (player.loading)
    return <PlayerState title="正在恢复练习" copy="回答、进度和已生成的评价正在同步。" />;
  if (player.loadError || !player.session)
    return <PlayerError message={player.loadError} onRetry={player.reload} />;
  if (player.session.status !== 'in_progress') {
    return (
      <PracticeCompletionPanel
        session={player.session}
        report={player.report}
        mastery={player.mastery}
        message={player.message}
        onRetry={player.reload}
      />
    );
  }
  return <ActivePractice player={player} />;
}

function ActivePractice({ player }: { player: ReturnType<typeof usePracticePlayer> }) {
  const session = player.session;
  if (!session) return null;
  const item = session.items[player.currentIndex] ?? session.items[0]!;
  const progress = practiceProgress(session);
  return (
    <div className="practice-player-page">
      <PlayerHeader title={session.title} progress={progress} />
      <div className="practice-player-layout">
        <PracticeQuestionNav
          session={session}
          currentIndex={player.currentIndex}
          onSelect={player.setCurrentIndex}
        />
        <PracticeQuestionStage
          item={item}
          draft={player.drafts[item.id] ?? ''}
          busy={player.busy}
          currentIndex={player.currentIndex}
          total={session.items.length}
          onDraft={(value) => player.updateDraft(item.id, value)}
          onSave={() => void player.save(item.id)}
          onPrevious={() => player.setCurrentIndex(Math.max(0, player.currentIndex - 1))}
          onNext={() =>
            player.setCurrentIndex(Math.min(session.items.length - 1, player.currentIndex + 1))
          }
        />
        <PracticeCoachPanel
          item={item}
          draft={player.drafts[item.id] ?? ''}
          solution={player.solutions[item.id]}
          busy={player.busy}
          issue={player.issue}
          onRevealSolution={() => void player.revealSolution(item.id)}
          onEvaluate={() => void player.evaluate(item.id)}
        />
      </div>
      <RoundCompletionBar player={player} />
    </div>
  );
}

function PlayerHeader({
  title,
  progress,
}: {
  title: string;
  progress: ReturnType<typeof practiceProgress>;
}) {
  return (
    <header className="practice-player-header">
      <div>
        <Link href="/questions">← 返回题库</Link>
        <span>Focused practice</span>
        <h1>{title}</h1>
      </div>
      <div className="practice-player-progress">
        <span>
          {progress.answered}/{progress.total} 已回答 · {progress.evaluated} 已评价
        </span>
        <progress value={progress.answered} max={progress.total} />
      </div>
    </header>
  );
}

function RoundCompletionBar({ player }: { player: ReturnType<typeof usePracticePlayer> }) {
  if (!player.session || !canCompleteSelfStudy(player.session)) return null;
  const aiReady = canSubmitAiReport(player.session);
  return (
    <section className="practice-round-actions">
      <div>
        <strong>{aiReady ? '全部题目已完成 AI 评价' : '全部回答已保存'}</strong>
        <p>
          {aiReady
            ? '可以生成整轮 AI 复盘并更新能力记录。'
            : '你可以继续逐题评价，或不生成分数直接结束自学。'}
        </p>
      </div>
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
          disabled={!aiReady || player.busy !== null}
          onClick={() => void player.submitAiReport()}
        >
          {player.busy === 'submit-ai' ? '生成中…' : '生成 AI 复盘'}
        </button>
      </div>
    </section>
  );
}

function PracticeEntry() {
  return (
    <div className="practice-entry-page">
      <section className="practice-entry" aria-labelledby="practice-entry-heading">
        <section className="practice-entry-hero">
          <span>Practice workspace · 自主训练</span>
          <h1 id="practice-entry-heading">
            把想练的题，
            <br />
            组合成一轮专注练习
          </h1>
          <p>
            无需完善个人档案，直接从公共题库选择 1–10 道题。作答、查看解析和 AI 评价均由你决定。
          </p>
          <div className="practice-entry-actions">
            <Link href="/questions">
              去题库选择题目 <span aria-hidden="true">→</span>
            </Link>
            <Link href="/home">返回题库大厅</Link>
          </div>
          <div className="practice-entry-facts" aria-label="练习说明">
            <span>
              <strong>1–10</strong> 每轮题目
            </span>
            <span>
              <strong>≈ 4 分钟</strong> 单题建议
            </span>
            <span>
              <strong>可选</strong> AI 评价
            </span>
          </div>
        </section>
        <PracticeEntryGuide />
      </section>
    </div>
  );
}

function PracticeEntryGuide() {
  return (
    <aside className="practice-entry-guide" aria-labelledby="practice-entry-guide-heading">
      <header>
        <span>本轮流程</span>
        <strong id="practice-entry-guide-heading">从选题到复盘，保持一个节奏</strong>
      </header>
      <ol>
        <li>
          <span>01</span>
          <div>
            <strong>组合题单</strong>
            <p>按方向、题型和难度自由筛选，题单跨分页保留。</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>逐题作答</strong>
            <p>回答会随时保存，可以在本轮题目间自由切换。</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>查看解析与评价</strong>
            <p>先独立思考，再按需查看标准解析或调用你的模型评价。</p>
          </div>
        </li>
      </ol>
      <div className="practice-entry-note">
        <span aria-hidden="true">✓</span>
        <p>
          <strong>个人档案不是刷题门槛</strong>档案和目标岗位仅用于增强 Agent 推荐。
        </p>
      </div>
    </aside>
  );
}
function PlayerState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="practice-player-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}
function PlayerError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="practice-player-state">
      <strong>练习没有加载成功</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        重新加载
      </button>
      <Link href="/questions">返回题库</Link>
    </div>
  );
}
