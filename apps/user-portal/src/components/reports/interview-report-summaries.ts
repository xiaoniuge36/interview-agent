import type { InterviewReport, InterviewSessionSummary } from '@interview-agent/contracts';

export const INTERVIEW_REPORT_SUMMARY_LIMIT = 20;
/** 报告详情按会话逐个拉取：限制并发，避免进入复盘页瞬间发出 20 个请求打满限流。 */
export const INTERVIEW_REPORT_SUMMARY_CONCURRENCY = 4;

export async function loadInterviewReportSummaries(
  interviews: InterviewSessionSummary[],
  loadReport: (sessionId: string) => Promise<InterviewReport>,
) {
  const requested = [...interviews]
    .filter((interview) => interview.status === 'report_ready')
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, INTERVIEW_REPORT_SUMMARY_LIMIT);
  const results = await settledWithConcurrency(
    requested.map((interview) => () => loadReport(interview.id)),
    INTERVIEW_REPORT_SUMMARY_CONCURRENCY,
  );
  return {
    items: results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    failed: results.some((result) => result.status === 'rejected'),
  };
}

async function settledWithConcurrency<TValue>(
  tasks: Array<() => Promise<TValue>>,
  limit: number,
): Promise<Array<PromiseSettledResult<TValue>>> {
  const results = new Array<PromiseSettledResult<TValue>>(tasks.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      const task = tasks[index];
      if (!task) continue;
      try {
        results[index] = { status: 'fulfilled', value: await task() };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  const workerCount = Math.max(1, Math.min(limit, tasks.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
