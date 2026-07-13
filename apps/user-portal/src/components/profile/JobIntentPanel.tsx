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
        <div className="eyebrow">目标岗位</div>
        <h2 className="h2">让问题贴近真实职位</h2>
        <p className="muted-text">填写岗位方向或粘贴职位说明，下一场模拟面试会据此生成问题。</p>
      </div>
      <JobIntentFields value={controller.form} onChange={controller.update} />
      <button className="button" type="submit" disabled={controller.busy}>
        {controller.busy ? '保存中…' : '保存岗位目标'}
      </button>
      <span id="job-status" className="muted-text small-text" aria-live="polite">
        {controller.message}
      </span>
      <LatestAnalysis job={props.latestJob} profile={props.profile} />
    </form>
  );
}
