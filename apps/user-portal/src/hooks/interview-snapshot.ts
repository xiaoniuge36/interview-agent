import type { InterviewReport, InterviewSession } from '@interview-agent/contracts';

type InterviewSnapshotInput = {
  loadSession: () => Promise<InterviewSession>;
  loadReport: () => Promise<InterviewReport>;
};

export type InterviewSnapshotResult =
  | { status: 'error'; error: unknown }
  | {
      status: 'ready' | 'partial';
      session: InterviewSession;
      report: InterviewReport | null;
    };

export async function loadInterviewSnapshot(
  input: InterviewSnapshotInput,
): Promise<InterviewSnapshotResult> {
  let session: InterviewSession;
  try {
    session = await input.loadSession();
  } catch (error) {
    return { status: 'error', error };
  }
  if (session.status !== 'report_ready') {
    return { status: 'ready', session, report: null };
  }
  try {
    return { status: 'ready', session, report: await input.loadReport() };
  } catch {
    return { status: 'partial', session, report: null };
  }
}
