import type { JobIntentPayload } from '@interview-agent/contracts';

export type JobSubmitAction = 'save' | 'save_and_start';

export function jobSubmitAction(value: string | null | undefined): JobSubmitAction {
  return value === 'save_and_start' ? 'save_and_start' : 'save';
}

export function interviewHrefForJob(jobIntentId: string) {
  return `/interview?job=${encodeURIComponent(jobIntentId)}`;
}

export function preferredJobIntentId(
  jobs: JobIntentPayload[],
  requestedId: string | null | undefined,
) {
  if (requestedId && jobs.some((job) => job.intent.id === requestedId)) return requestedId;
  return jobs[0]?.intent.id ?? '';
}

export function handoffSavedJob(
  action: JobSubmitAction,
  payload: JobIntentPayload,
  onStart: (payload: JobIntentPayload) => void,
) {
  if (action === 'save_and_start') onStart(payload);
}
