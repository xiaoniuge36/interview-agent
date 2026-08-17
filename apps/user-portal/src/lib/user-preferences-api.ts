import {
  UpsertUserPreferenceInputSchema,
  UserPreferencePayloadSchema,
  type ThemePreferences,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export function createGetUserPreferencesRequest() {
  return {
    path: '/user-preferences',
    schema: UserPreferencePayloadSchema,
  } as const;
}

export function createSaveUserPreferencesRequest(input: ThemePreferences) {
  const validated = UpsertUserPreferenceInputSchema.parse(input);
  return {
    path: '/user-preferences',
    schema: UserPreferencePayloadSchema,
    init: { method: 'PUT', body: JSON.stringify(validated) },
  } as const;
}

export function getUserPreferences() {
  return apiRequest(createGetUserPreferencesRequest());
}

export function saveUserPreferences(input: ThemePreferences) {
  return apiRequest(createSaveUserPreferencesRequest(input));
}
