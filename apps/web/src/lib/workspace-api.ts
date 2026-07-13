import {
  CreateJobIntentInputSchema,
  JobIntentListSchema,
  JobIntentPayloadSchema,
  ProfilePayloadSchema,
  UpsertProfileInputSchema,
  type CreateJobIntentInput,
  type JobIntentPayload,
  type ProfilePayload,
  type UpsertProfileInput,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export type WorkspaceData = {
  profile: ProfilePayload;
  jobs: JobIntentPayload[];
};

export async function loadWorkspaceData(): Promise<WorkspaceData> {
  const [profile, jobs] = await Promise.all([
    apiRequest({ path: '/profile', schema: ProfilePayloadSchema }),
    apiRequest({ path: '/job-intents', schema: JobIntentListSchema }),
  ]);
  return { profile, jobs };
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
