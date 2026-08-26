import type { InterviewReport, InterviewSessionSummary } from '@interview-agent/contracts';

export const INTERVIEW_REPORT_SUMMARY_LIMIT = 20;

export async function loadInterviewReportSummaries(
  interviews: InterviewSessionSummary[],
  loadReport: (sessionId: string) => Promise<InterviewReport>,
) {
  const requested = [...interviews]
    .filter((interview) => interview.status === 'report_ready')
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, INTERVIEW_REPORT_SUMMARY_LIMIT);
  const results = await Promise.allSettled(requested.map((interview) => loadReport(interview.id)));
  return {
    items: results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    failed: results.some((result) => result.status === 'rejected'),
  };
}
