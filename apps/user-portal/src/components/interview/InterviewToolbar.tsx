import type { JobIntentPayload } from '@interview-agent/contracts';
import Link from 'next/link';
import type { InterviewController } from '@/hooks/useInterviewController';
import { archivedInterviewControl } from './archived-interview-control';

type InterviewToolbarProps = {
  jobs: JobIntentPayload[];
  controller: InterviewController;
};

export function InterviewToolbar({ jobs, controller }: InterviewToolbarProps) {
  const control = archivedInterviewControl({
    hasArchivedTarget: Boolean(controller.restoredSessionId),
    hasSession: Boolean(controller.state.session),
    busy: controller.state.busy,
    loadFailed: controller.archivedLoadFailed,
  });
  return (
    <div className="toolbar interview-toolbar">
      <div className="interview-toolbar-controls">
        <label className="sr-only" htmlFor="interview-job">
          选择本轮训练岗位
        </label>
        <select
          id="interview-job"
          className="input"
          value={controller.selectedJobId}
          onChange={(event) => controller.setSelectedJobId(event.target.value)}
        >
          <option value="">未关联已保存目标岗位（通用互联网岗位训练）</option>
          {jobs.map((job) => (
            <option value={job.intent.id} key={job.intent.id}>
              {job.intent.targetRole}
            </option>
          ))}
        </select>
        <button
          className="button"
          type="button"
          disabled={control.disabled}
          onClick={() => {
            if (control.action === 'retry') controller.reloadArchivedInterview();
            else void controller.start();
          }}
        >
          {control.label}
        </button>
      </div>
      <Link className="button secondary" href="/settings">
        AI 模型设置
      </Link>
      <p>启动后，AI 会基于已选岗位与当前回答继续追问。</p>
    </div>
  );
}
