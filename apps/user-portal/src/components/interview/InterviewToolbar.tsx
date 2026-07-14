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
        disabled={controller.state.busy}
        onClick={() => void controller.start()}
      >
        {controller.state.session ? '重新开始本轮' : '开始模拟面试'}
      </button>
    </div>
  );
}

