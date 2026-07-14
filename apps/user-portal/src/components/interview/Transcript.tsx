import type { InterviewTurn } from '@interview-agent/contracts';
import { interviewSpeakerLabel, interviewStageLabel } from './interview-labels';

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

