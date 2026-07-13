import type { JobIntentPayload } from '@interview-agent/contracts';
import type { InterviewController } from '@/hooks/useInterviewController';

type InterviewToolbarProps = {
  jobs: JobIntentPayload[];
  controller: InterviewController;
};

export function InterviewToolbar({ jobs, controller }: InterviewToolbarProps) {
  return (
    <div className="toolbar">
      <label className="sr-only" htmlFor="interview-job">
        选择岗位意图
      </label>
      <select
        id="interview-job"
        className="input"
        value={controller.selectedJobId}
        onChange={(event) => controller.setSelectedJobId(event.target.value)}
      >
        <option value="">不关联 JD（使用通用 Agent 场景）</option>
        {jobs.map((job) => (
          <option value={job.intent.id} key={job.intent.id}>
            {job.intent.targetRole}
          </option>
        ))}
      </select>
      <button
        className="button"
        type="button"
        disabled={controller.state.busy}
        onClick={() => void controller.start()}
      >
        {controller.state.session ? '重新开始' : '开始面试'}
      </button>
    </div>
  );
}
