import type { JobIntentPayload } from '@interview-agent/contracts';
import type { InterviewController } from '@/hooks/useInterviewController';
import { AnswerComposer } from './AnswerComposer';
import { InterviewToolbar } from './InterviewToolbar';
import { Transcript } from './Transcript';

type InterviewConsoleProps = {
  jobs: JobIntentPayload[];
  controller: InterviewController;
};

export function InterviewConsole({ jobs, controller }: InterviewConsoleProps) {
  return (
    <div className="panel stack">
      <header className="row-between">
        <div>
          <div className="eyebrow">Mock Interview</div>
          <h2 className="h2">Agent 模拟面试</h2>
          <p className="muted-text">
            由 Product API 维护会话状态，Agent Runtime 返回结构化结果，并通过 SSE 实时同步。
          </p>
        </div>
        <span className="chip" aria-label={'面试状态 ' + controller.statusLabel}>
          <span className="status-dot" />
          {controller.statusLabel}
        </span>
      </header>
      <InterviewToolbar jobs={jobs} controller={controller} />
      <Transcript turns={controller.turns} streamingText={controller.state.streamingText} />
      <AnswerComposer controller={controller} />
    </div>
  );
}
