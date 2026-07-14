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
  const { focusTags, roleTitle } = controller.interviewPlan;
  return (
    <div className="panel stack">
      <header className="row-between">
        <div>
          <div className="eyebrow">模拟面试</div>
          <h2 className="h2">像真实面试一样，逐题作答</h2>
          <p className="muted-text">
            围绕{roleTitle}的真实考察维度，获得有针对性的追问与可执行的复盘建议。
          </p>
        </div>
        <span className="chip" aria-label={'面试状态 ' + controller.statusLabel}>
          <span className="status-dot" />
          {controller.statusLabel}
        </span>
      </header>
      <div className="interview-context" aria-label={'训练岗位 ' + roleTitle}>
        <span className="chip interview-role-chip">训练岗位 · {roleTitle}</span>
        <div className="interview-focus-tags" aria-label="本轮重点考察能力">
          {focusTags.map((tag) => (
            <span className="chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <InterviewToolbar jobs={jobs} controller={controller} />
      <Transcript turns={controller.turns} streamingText={controller.state.streamingText} />
      <AnswerComposer controller={controller} />
    </div>
  );
}

