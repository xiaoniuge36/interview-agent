'use client';

import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';
import { JobIntentFields } from './JobIntentFields';
import { LatestAnalysis } from './LatestAnalysis';
import { useJobIntentForm } from './useJobIntentForm';

type JobIntentPanelProps = {
  profile: ProfilePayload;
  latestJob: JobIntentPayload | undefined;
  onCreated: (payload: JobIntentPayload) => void;
};

export function JobIntentPanel(props: JobIntentPanelProps) {
  const controller = useJobIntentForm(props.onCreated);
  return (
    <form className="panel stack" onSubmit={controller.submit}>
      <div>
        <div className="eyebrow">JD Agent</div>
        <h2 className="h2">岗位意图分析</h2>
        <p className="muted-text">面试会话只引用 Product API 保存并审计过的岗位意图。</p>
      </div>
      <JobIntentFields value={controller.form} onChange={controller.update} />
      <button className="button" type="submit" disabled={controller.busy}>
        {controller.busy ? '分析中...' : '生成岗位意图'}
      </button>
      <span id="job-status" className="muted-text small-text" aria-live="polite">
        {controller.message}
      </span>
      <LatestAnalysis job={props.latestJob} profile={props.profile} />
    </form>
  );
}
