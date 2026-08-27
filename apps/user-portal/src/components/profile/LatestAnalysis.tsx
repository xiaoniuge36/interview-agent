import type { CSSProperties } from 'react';
import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';
import { CountUp } from '@/components/motion/CountUp';
import { JdMatchPanel } from './JdMatchPanel';

type LatestAnalysisProps = {
  job: JobIntentPayload | undefined;
  profile: ProfilePayload;
};

const PREVIEW_RISE_DELAY = { '--rise-delay': '150ms' } as CSSProperties;

export function LatestAnalysis({ job, profile }: LatestAnalysisProps) {
  const insights = job?.profile?.interviewFocus ??
    profile.snapshot?.weaknesses ?? ['保存个人画像或目标岗位后，这里会展示训练重点'];
  return (
    <aside
      className="job-training-preview motion-rise"
      style={PREVIEW_RISE_DELAY}
      aria-labelledby="job-training-preview-title"
    >
      <div className="job-training-preview-heading">
        <span className="eyebrow">训练重点预览</span>
        <h2 id="job-training-preview-title">这份 JD 会怎样改变下一场面试</h2>
        <p>Agent 会把岗位能力、项目证据和表达重点组织成连续追问。</p>
      </div>
      <section className="job-analysis-card" aria-label="最新岗位分析">
        <span>当前训练目标</span>
        <h3>{job?.intent.targetRole ?? '尚未保存目标岗位'}</h3>
        <div className="job-analysis-signals">
          {insights.map((item) => (
            <i key={item}>{item}</i>
          ))}
        </div>
        {job?.profile ? <SkillWeights job={job} /> : null}
        <JobJdMatch job={job} />
      </section>
      <TrainingPath />
    </aside>
  );
}

function JobJdMatch({ job }: { job: JobIntentPayload | undefined }) {
  if (!job) return null;
  const jdContext = [job.intent.jdText, job.intent.companyContext ?? ''].join('\n');
  return <JdMatchPanel jdContext={jdContext} />;
}

function TrainingPath() {
  return (
    <div className="job-training-path" aria-label="岗位信息的训练用途">
      <TrainingPathItem mark="问" title="岗位能力" copy="从 JD 中提取必须掌握的知识与判断。" />
      <TrainingPathItem mark="追" title="项目证据" copy="围绕真实经历继续追问取舍和结果。" />
      <TrainingPathItem mark="评" title="表达反馈" copy="在复盘中对照岗位要求标出改进方向。" />
    </div>
  );
}

function TrainingPathItem({ mark, title, copy }: { mark: string; title: string; copy: string }) {
  return (
    <div>
      <span aria-hidden="true">{mark}</span>
      <p>
        <strong>{title}</strong>
        <small>{copy}</small>
      </p>
    </div>
  );
}

function SkillWeights({ job }: { job: JobIntentPayload }) {
  return (
    <div className="score-list">
      {job.profile?.skillWeights.map((item) => (
        <div className="score-row" key={item.skill}>
          <span>{item.skill}</span>
          <strong>
            <CountUp value={item.weight} />
          </strong>
        </div>
      ))}
    </div>
  );
}
