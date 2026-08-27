import type { JobIntentPayload } from '@interview-agent/contracts';
import type { InterviewController } from '@/hooks/useInterviewController';
import { AnswerComposer } from './AnswerComposer';
import { InterviewSessionPulse } from './InterviewSessionPulse';
import { InterviewStageRail } from './InterviewStageRail';
import { InterviewToolbar } from './InterviewToolbar';
import { Transcript } from './Transcript';

type InterviewConsoleProps = {
  jobs: JobIntentPayload[];
  controller: InterviewController;
};

export function InterviewConsole({ jobs, controller }: InterviewConsoleProps) {
  const { focusTags, roleTitle } = controller.interviewPlan;
  const session = controller.state.session;
  const reportRecoveryRequired =
    session?.status === 'report_ready' && controller.state.report === null;
  return (
    <div className="panel stack motion-rise">
      <header className="interview-console-header" aria-label={'训练岗位 ' + roleTitle}>
        <div className="interview-context">
          <span className="chip interview-role-chip">训练岗位 · {roleTitle}</span>
          <div className="interview-focus-tags" aria-label="本轮重点考察能力">
            {focusTags.map((tag) => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <span className="chip" aria-label={'面试状态 ' + controller.statusLabel}>
          <span className="status-dot" />
          {controller.statusLabel}
        </span>
      </header>
      <InterviewStageRail session={session} />
      <InterviewSessionPulse
        session={session}
        phase={controller.state.phase}
        statusLabel={controller.statusLabel}
      />
      <InterviewToolbar
        jobs={jobs}
        controller={controller}
        reportRecoveryRequired={reportRecoveryRequired}
      />
      <Transcript
        turns={controller.turns}
        streamingText={controller.state.streamingText}
        ended={session?.status === 'report_ready'}
      />
      <AnswerComposer controller={controller} />
    </div>
  );
}
