'use client';

import type { JobIntentPayload } from '@interview-agent/contracts';
import { useInterviewController } from '@/hooks/useInterviewController';
import { InterviewConsole } from './InterviewConsole';
import { InterviewFlowGuide } from './InterviewFlowGuide';
import { InterviewReviewEvidenceNotice } from './InterviewReviewEvidenceNotice';
import { ReportPanel } from './ReportPanel';
import { RuntimeEventList } from './RuntimeEventList';
import { useInterviewReviewPractice } from './useInterviewReviewPractice';

type InterviewWorkspaceProps = {
  jobs: JobIntentPayload[];
};

const MAX_INTERVIEW_SOURCES = 6;

export function InterviewWorkspace({ jobs }: InterviewWorkspaceProps) {
  const controller = useInterviewController(jobs);
  const reviewPractice = useInterviewReviewPractice();
  /* 无会话也无待恢复会话时，进度和复盘都不会有内容，侧栏换成流程引导。 */
  const idle = !controller.state.session && !controller.restoredSessionId;
  return (
    <section className="interview section-gap">
      <InterviewConsole jobs={jobs} controller={controller} />
      <aside className="stack" aria-label="训练进度与面试复盘">
        {idle ? (
          <InterviewFlowGuide />
        ) : (
          <>
            <InterviewReviewEvidenceNotice
              interviewSessionId={controller.state.session?.id ?? controller.restoredSessionId}
            />
            <RuntimeEventList
              events={controller.state.events}
              phase={controller.state.phase}
              basisSummary={controller.state.basisSummary}
              sourceCount={interviewSourceCount(controller.state.session)}
            />
            <ReportPanel
              report={controller.state.report}
              sessionStatus={controller.state.session?.status ?? null}
              connectionLost={controller.state.connectionLost}
              onRetry={reportRetryHandler(controller)}
              retrying={controller.archivedReloading}
              sessionId={controller.state.session?.id}
              onStartInterviewReview={reviewPractice.start}
              reviewStarting={reviewPractice.starting}
            />
          </>
        )}
      </aside>
    </section>
  );
}

/* 只要能定位到会话（活动或待恢复），生成中/断连/报告缺失都提供手动重查入口。 */
function reportRetryHandler(controller: ReturnType<typeof useInterviewController>) {
  const sessionId = controller.state.session?.id ?? controller.restoredSessionId;
  return sessionId ? controller.reloadArchivedInterview : undefined;
}

function interviewSourceCount(
  session: ReturnType<typeof useInterviewController>['state']['session'],
) {
  const sourceIds = session?.turns.at(-1)?.structuredPayload?.sourceIds;
  if (!Array.isArray(sourceIds)) return 0;
  return sourceIds
    .filter((sourceId) => typeof sourceId === 'string')
    .slice(0, MAX_INTERVIEW_SOURCES).length;
}
