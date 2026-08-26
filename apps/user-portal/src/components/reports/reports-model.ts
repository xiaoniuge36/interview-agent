import type { InterviewSessionSummary } from '@interview-agent/contracts';

export function latestReportReadyInterview(interviews: InterviewSessionSummary[]) {
  const completed = interviews.filter((interview) => interview.status === 'report_ready');
  if (!completed.length) return null;
  return completed.reduce((latest, current) =>
    Date.parse(current.updatedAt) > Date.parse(latest.updatedAt) ? current : latest,
  );
}
