import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';

type ReconciliationInput = {
  currentSession: PracticeSession;
  submitReport: () => Promise<PracticeReport>;
  loadSession: () => Promise<PracticeSession>;
  loadMastery: () => Promise<MasteryProfile[]>;
};

type CompletionExtrasInput = {
  session: PracticeSession;
  loadReport: () => Promise<PracticeReport>;
  loadMastery: () => Promise<MasteryProfile[]>;
};

export type PracticeReportReconciliation = {
  report: PracticeReport;
  session: PracticeSession;
  mastery: MasteryProfile[] | null;
  synchronizationComplete: boolean;
};

export type PracticeReportOutcome = {
  tone: 'success' | 'info';
  message: string;
  notificationDetail: string;
};

export async function reconcilePracticeReport(
  input: ReconciliationInput,
): Promise<PracticeReportReconciliation> {
  const report = await input.submitReport();
  const [sessionResult, masteryResult] = await Promise.allSettled([
    input.loadSession(),
    input.loadMastery(),
  ]);
  const session =
    sessionResult.status === 'fulfilled'
      ? sessionResult.value
      : { ...input.currentSession, status: 'report_ready' as const };
  const mastery = masteryResult.status === 'fulfilled' ? masteryResult.value : null;
  return {
    report,
    session,
    mastery,
    synchronizationComplete:
      sessionResult.status === 'fulfilled' && masteryResult.status === 'fulfilled',
  };
}

export function practiceReportOutcome(synchronizationComplete: boolean): PracticeReportOutcome {
  return synchronizationComplete
    ? {
        tone: 'success',
        message: 'AI 复盘已生成，能力记录已同步更新。',
        notificationDetail: '评分与能力记录已从服务端同步完成。',
      }
    : {
        tone: 'info',
        message: 'AI 复盘已生成，部分训练状态将在刷新后继续同步。',
        notificationDetail: '报告已保留；刷新页面可继续同步训练状态与能力记录。',
      };
}

export async function loadPracticeCompletionExtras(input: CompletionExtrasInput) {
  if (input.session.status !== 'report_ready') {
    return { report: null, mastery: [] as MasteryProfile[] };
  }
  const [reportResult, masteryResult] = await Promise.allSettled([
    input.loadReport(),
    input.loadMastery(),
  ]);
  return {
    report: reportResult.status === 'fulfilled' ? reportResult.value : null,
    mastery: masteryResult.status === 'fulfilled' ? masteryResult.value : [],
  };
}
