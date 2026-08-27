import type { CreateJobIntentInput } from '@interview-agent/contracts';
import { roleInputFor } from '@/lib/interview-roles';

export const DEFAULT_JOB_FORM: CreateJobIntentInput = {
  targetRole: '',
  jdText: '',
  companyContext: '',
  communicationText: '',
  interviewDate: null,
};

export function jobFormFromRole(title: string): CreateJobIntentInput {
  return roleInputFor(title);
}

export function updateJobForm<Key extends keyof CreateJobIntentInput>(
  form: CreateJobIntentInput,
  key: Key,
  value: CreateJobIntentInput[Key],
): CreateJobIntentInput {
  return { ...form, [key]: value };
}

type JobFieldIssue = { path: readonly (string | number)[] };

const JOB_FIELD_IDS: Partial<Record<keyof CreateJobIntentInput, string>> = {
  targetRole: 'job-target-role',
  jdText: 'job-description',
  companyContext: 'job-company-context',
  communicationText: 'job-communication',
};

export function focusFirstInvalidJobField(
  issues: readonly JobFieldIssue[],
  focus: (id: string) => void,
): string | undefined {
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    const id = JOB_FIELD_IDS[field as keyof CreateJobIntentInput];
    if (!id) continue;
    focus(id);
    return id;
  }
  return undefined;
}
