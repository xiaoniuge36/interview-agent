import { useEffect, useRef } from 'react';
import type { InterviewTurn } from '@interview-agent/contracts';
import { interviewSpeakerLabel, interviewStageLabel } from './interview-labels';

type TranscriptProps = {
  turns: InterviewTurn[];
  streamingText: string;
  ended?: boolean;
};

export function Transcript({ turns, streamingText, ended = false }: TranscriptProps) {
  const empty = turns.length === 0 && !streamingText;
  const containerRef = useAutoScrollToLatest(turns.length, streamingText);
  return (
    <div
      ref={containerRef}
      className="transcript"
      data-state={streamingText ? 'streaming' : 'ready'}
      data-ended-empty={ended && empty ? 'true' : undefined}
      aria-live="polite"
      aria-label="面试对话"
    >
      {empty ? <EmptyTranscript ended={ended} /> : null}
      {turns.map((turn) => (
        <TranscriptTurn turn={turn} key={turn.id} />
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

function TranscriptTurn({ turn }: { turn: InterviewTurn }) {
  const tone = turn.role === 'candidate' ? 'candidate' : 'interviewer';
  return (
    <article className={'turn ' + tone}>
      <div className="stage">
        {interviewSpeakerLabel(turn.role)} · {interviewStageLabel(turn.stage)}
      </div>
      {turn.content}
    </article>
  );
}

function StreamingTurn({ content }: { content: string }) {
  return (
    <article className="turn interviewer">
      <div className="stage">AI 面试官 · 正在组织追问</div>
      {content}
    </article>
  );
}
