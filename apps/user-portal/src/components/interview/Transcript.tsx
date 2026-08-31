import { useEffect, useRef } from 'react';
import type { InterviewTurn } from '@interview-agent/contracts';
import { interviewSpeakerLabel, interviewStageLabel } from './interview-labels';

type TranscriptProps = {
  turns: InterviewTurn[];
  streamingText: string;
  ended?: boolean;
  onReplayTurn?: ((content: string) => void) | undefined;
};

export function Transcript({ turns, streamingText, ended = false, onReplayTurn }: TranscriptProps) {
  const empty = turns.length === 0 && !streamingText;
  const containerRef = useAutoScrollToLatest(turns.length, streamingText);
  return (
    <div
      ref={containerRef}
      className="transcript"
      data-state={streamingText ? 'streaming' : 'ready'}
      data-ended-empty={ended && empty ? 'true' : undefined}
      aria-label="面试对话"
    >
      {empty ? <EmptyTranscript ended={ended} /> : null}
      {turns.map((turn) => (
        <TranscriptTurn turn={turn} key={turn.id} onReplay={onReplayTurn} />
      ))}
      {streamingText ? <StreamingTurn content={streamingText} /> : null}
    </div>
  );
}

/* 距底部不足该值视为“正在跟随最新消息”，超过则认为用户在向上回看。 */
const FOLLOW_BOTTOM_THRESHOLD_PX = 80;

/**
 * 恢复会话的首次填充直接定位到最新一条；此后新消息或流式 token 到达时，
 * 仅当用户停在底部附近才跟随，避免打断向上回看。
 */
function useAutoScrollToLatest(turnCount: number, streamingText: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(0);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const initialFill = previousCountRef.current === 0 && turnCount > 0;
    previousCountRef.current = turnCount;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (initialFill || distanceFromBottom <= FOLLOW_BOTTOM_THRESHOLD_PX) {
      node.scrollTop = node.scrollHeight;
    }
  }, [turnCount, streamingText]);
  return containerRef;
}

function EmptyTranscript({ ended }: { ended: boolean }) {
  if (ended) {
    return (
      <div className="empty-state">
        <div className="eyebrow">本轮已结束</div>
        <h3>本轮复盘已生成</h3>
        <p className="muted-text">对话记录已归档；右侧复盘面板保留了评分、薄弱环节与下一步建议。</p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <div className="eyebrow">开始训练</div>
      <h3>准备好后，开始一场新的模拟面试</h3>
      <p className="muted-text">
        选择目标岗位并开始训练。AI 面试官会根据你的回答继续追问，并在结束后给出复盘建议。
      </p>
    </div>
  );
}

function TranscriptTurn({
  turn,
  onReplay,
}: {
  turn: InterviewTurn;
  onReplay?: ((content: string) => void) | undefined;
}) {
  const tone = turn.role === 'candidate' ? 'candidate' : 'interviewer';
  const replayable = turn.role === 'interviewer' && Boolean(onReplay);
  return (
    <article className={'turn ' + tone}>
      <div className="stage">
        <span>
          {interviewSpeakerLabel(turn.role)} · {interviewStageLabel(turn.stage)}
        </span>
        {replayable ? (
          <button
            type="button"
            className="turn-replay"
            aria-label="朗读这条问题"
            onClick={() => onReplay?.(turn.content)}
          >
            <SpeakerIcon />
            重听
          </button>
        ) : null}
      </div>
      {turn.content}
    </article>
  );
}

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

/* 只有流式中的气泡进 live region：整卷对话挂 aria-live 会让读屏在每个 token 后重读全文。 */
function StreamingTurn({ content }: { content: string }) {
  return (
    <article className="turn interviewer" aria-live="polite" aria-busy="true">
      <div className="stage">AI 面试官 · 正在组织追问</div>
      {content}
    </article>
  );
}
