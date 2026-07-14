import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';

type LatestAnalysisProps = {
  job: JobIntentPayload | undefined;
  profile: ProfilePayload;
};

export function LatestAnalysis({ job, profile }: LatestAnalysisProps) {
  const insights = job?.profile?.interviewFocus ??
    profile.snapshot?.weaknesses ?? ['保存个人画像或目标岗位后，这里会展示训练重点'];
  return (
    <div className="insight-card">
      <div className="eyebrow">最新岗位分析</div>
      <h3>{job?.intent.targetRole ?? '尚未保存目标岗位'}</h3>
      <div className="stack compact">
        {insights.map((item) => (
          <span className="chip" key={item}>
            {item}
          </span>
        ))}
      </div>
      {job?.profile ? <SkillWeights job={job} /> : null}
    </div>
  );
}

function SkillWeights({ job }: { job: JobIntentPayload }) {
  return (
    <div className="score-list">
      {job.profile?.skillWeights.map((item) => (
        <div className="score-row" key={item.skill}>
          <span>{item.skill}</span>
          <strong>{item.weight}</strong>
        </div>
      ))}
    </div>
  );
}
