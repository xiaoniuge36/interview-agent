'use client';

import type { JobIntentPayload } from '@interview-agent/contracts';
import { useInterviewController } from '@/hooks/useInterviewController';
import { InterviewConsole } from './InterviewConsole';
import { ReportPanel } from './ReportPanel';
import { RuntimeEventList } from './RuntimeEventList';
import { useInterviewReviewPractice } from './useInterviewReviewPractice';

type InterviewWorkspaceProps = {
  jobs: JobIntentPayload[];
};

export function InterviewWorkspace({ jobs }: InterviewWorkspaceProps) {
  const controller = useInterviewController(jobs);
  const reviewPractice = useInterviewReviewPractice();
  return (
    <section className="interview section-gap">
      <InterviewConsole jobs={jobs} controller={controller} />
      <aside className="stack" aria-label="训练进度与面试复盘">
        <RuntimeEventList
          events={controller.state.events}
          phase={controller.state.phase}
          basisSummary={controller.state.basisSummary}
        />
        <ReportPanel
          report={controller.state.report}
          sessionStatus={controller.state.session?.status ?? null}
          onRetry={controller.restoredSessionId ? controller.reloadArchivedInterview : undefined}
          retrying={controller.state.busy}
          sessionId={controller.state.session?.id}
          onStartInterviewReview={reviewPractice.start}
          reviewStarting={reviewPractice.starting}
        />
      </aside>
    </section>
  );
}
