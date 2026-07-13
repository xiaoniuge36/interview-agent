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
          <div className="eyebrow">模拟面试</div>
          <h2 className="h2">像真实面试一样，逐题作答</h2>
          <p className="muted-text">选择岗位后开始。系统会记录回答、追问与可执行的改进建议。</p>
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
