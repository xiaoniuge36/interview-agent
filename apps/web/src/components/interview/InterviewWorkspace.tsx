'use client';

import type { JobIntentPayload } from '@interview-agent/contracts';
import { useInterviewController } from '@/hooks/useInterviewController';
import { InterviewConsole } from './InterviewConsole';
import { ReportPanel } from './ReportPanel';
import { RuntimeEventList } from './RuntimeEventList';

type InterviewWorkspaceProps = {
  jobs: JobIntentPayload[];
};

export function InterviewWorkspace({ jobs }: InterviewWorkspaceProps) {
  const controller = useInterviewController(jobs);
  return (
    <section id="interview" className="interview section-gap">
      <InterviewConsole jobs={jobs} controller={controller} />
      <aside className="stack" aria-label="运行事件与面试报告">
        <RuntimeEventList events={controller.state.events} />
        <ReportPanel report={controller.state.report} />
      </aside>
    </section>
  );
}
