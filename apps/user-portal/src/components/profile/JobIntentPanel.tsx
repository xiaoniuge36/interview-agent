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
    <form className="panel stack agent-form-panel" onSubmit={controller.submit}>
      <div>
        <div className="eyebrow">岗位模型</div>
        <h2 className="h2">目标 JD 与考察重点</h2>
        <p className="muted-text">
          从常见岗位模板开始，或直接粘贴真实 JD。下一场模拟会围绕岗位能力重点进行追问。
        </p>
      </div>
      <JobIntentFields
        value={controller.form}
        onChange={controller.update}
        onApplyRole={controller.applyRoleTemplate}
      />
      <button className="button" type="submit" disabled={controller.busy}>
        {controller.busy ? '保存中…' : '保存目标岗位'}
      </button>
      <span id="job-status" className="muted-text small-text" aria-live="polite">
        {controller.message}
      </span>
      <LatestAnalysis job={props.latestJob} profile={props.profile} />
    </form>
  );
}
