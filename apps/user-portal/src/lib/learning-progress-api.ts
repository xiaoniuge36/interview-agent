import {
  UpsertLearningProgressInputSchema,
  UserLearningProgressPayloadSchema,
  type LearningProgressState,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export function createGetLearningProgressRequest() {
  return {
    path: '/learning-progress',
    schema: UserLearningProgressPayloadSchema,
  } as const;
}

export function createSaveLearningProgressRequest(input: LearningProgressState) {
  const validated = UpsertLearningProgressInputSchema.parse(input);
  return {
    path: '/learning-progress',
    schema: UserLearningProgressPayloadSchema,
    init: { method: 'PUT', body: JSON.stringify(validated) },
  } as const;
}

export function getLearningProgress() {
  return apiRequest(createGetLearningProgressRequest());
}

export function saveLearningProgress(input: LearningProgressState) {
  return apiRequest(createSaveLearningProgressRequest(input));
}
