import type { InterviewTurn } from '@interview-agent/contracts';

type TranscriptProps = {
  turns: InterviewTurn[];
  streamingText: string;
};

export function Transcript({ turns, streamingText }: TranscriptProps) {
  const empty = turns.length === 0 && !streamingText;
  return (
    <div className="transcript" aria-live="polite" aria-label="面试对话">
      {empty ? <EmptyTranscript /> : null}
      {turns.map((turn) => (
        <TranscriptTurn turn={turn} key={turn.id} />
      ))}
      {streamingText ? <StreamingTurn content={streamingText} /> : null}
    </div>
  );
}

function EmptyTranscript() {
  return (
    <div className="empty-state">
      <div className="eyebrow">Ready</div>
      <h3>准备好后创建一场新的模拟面试</h3>
      <p className="muted-text">
        会话由 Product API 管理，Runtime 负责推理，并通过 SSE 实时返回过程事件。
      </p>
    </div>
  );
}

function TranscriptTurn({ turn }: { turn: InterviewTurn }) {
  const tone = turn.role === 'candidate' ? 'candidate' : 'interviewer';
  return (
    <article className={'turn ' + tone}>
      <div className="stage">
        {turn.role} · {turn.stage}
      </div>
      {turn.content}
    </article>
  );
}

function StreamingTurn({ content }: { content: string }) {
  return (
    <article className="turn interviewer">
      <div className="stage">interviewer · streaming</div>
      {content}
    </article>
  );
}
