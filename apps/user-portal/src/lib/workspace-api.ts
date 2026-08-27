import {
  CreateJobIntentInputSchema,
  JobIntentListSchema,
  JobIntentPayloadSchema,
  ProfilePayloadSchema,
  UpdateJobIntentScheduleSchema,
  UpsertProfileInputSchema,
  type CreateJobIntentInput,
  type InterviewSessionSummary,
  type JobIntentPayload,
  type ProfilePayload,
  type UpdateJobIntentSchedule,
  type UpsertProfileInput,
} from '@interview-agent/contracts';
import { apiRequest } from './api';
import { listInterviews } from './interview-api';

export type WorkspaceData = {
  profile: ProfilePayload;
  jobs: JobIntentPayload[];
  interviews: InterviewSessionSummary[];
};

export async function loadWorkspaceData(): Promise<WorkspaceData> {
  const [profile, jobs, interviews] = await Promise.all([
    apiRequest({ path: '/profile', schema: ProfilePayloadSchema }),
    apiRequest({ path: '/job-intents', schema: JobIntentListSchema }),
    listInterviews().catch(() => [] as InterviewSessionSummary[]),
  ]);
  return { profile, jobs, interviews };
}

export function upsertProfile(input: UpsertProfileInput): Promise<ProfilePayload> {
  const validated = UpsertProfileInputSchema.parse(input);
  return apiRequest({
    path: '/profile',
    schema: ProfilePayloadSchema,
    init: { method: 'PUT', body: JSON.stringify(validated) },
  });
}

export function createJobIntent(input: CreateJobIntentInput): Promise<JobIntentPayload> {
  const validated = CreateJobIntentInputSchema.parse(input);
  return apiRequest({
    path: '/job-intents',
    schema: JobIntentPayloadSchema,
    init: { method: 'POST', body: JSON.stringify(validated) },
  });
}

export function listJobIntents(): Promise<JobIntentPayload[]> {
  return apiRequest({ path: '/job-intents', schema: JobIntentListSchema });
}

export function updateJobIntentSchedule(
  id: string,
  input: UpdateJobIntentSchedule,
): Promise<JobIntentPayload> {
  const validated = UpdateJobIntentScheduleSchema.parse(input);
  return apiRequest({
    path: `/job-intents/${id}/schedule`,
    schema: JobIntentPayloadSchema,
    init: { method: 'PATCH', body: JSON.stringify(validated) },
  });
}
