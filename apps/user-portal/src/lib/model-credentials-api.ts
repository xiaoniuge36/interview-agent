import {
  AvailableModelListSchema,
  CreateModelCredentialInputSchema,
  DiscoverAvailableModelsInputSchema,
  ModelCredentialListSchema,
  ModelCredentialViewSchema,
  UpdateModelCredentialInputSchema,
  type AvailableModel,
  type CreateModelCredentialInput,
  type DiscoverAvailableModelsInput,
  type ModelCredentialView,
  type UpdateModelCredentialInput,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export function listModelCredentials(): Promise<ModelCredentialView[]> {
  return apiRequest({ path: '/model-credentials', schema: ModelCredentialListSchema });
}

export function discoverAvailableModels(
  input: DiscoverAvailableModelsInput,
): Promise<AvailableModel[]> {
  return apiRequest({
    path: '/model-credentials/available-models',
    schema: AvailableModelListSchema,
    init: {
      method: 'POST',
      body: JSON.stringify(DiscoverAvailableModelsInputSchema.parse(input)),
    },
  });
}

export function createModelCredential(
  input: CreateModelCredentialInput,
): Promise<ModelCredentialView> {
  return sendCredential(
    '/model-credentials',
    'POST',
    CreateModelCredentialInputSchema.parse(input),
  );
}

export function updateModelCredential(
  credentialId: string,
  input: UpdateModelCredentialInput,
): Promise<ModelCredentialView> {
  return sendCredential(
    `/model-credentials/${credentialId}`,
    'PATCH',
    UpdateModelCredentialInputSchema.parse(input),
  );
}

export function testModelCredential(credentialId: string): Promise<ModelCredentialView> {
  return apiRequest({
    path: `/model-credentials/${credentialId}/test`,
    schema: ModelCredentialViewSchema,
    init: { method: 'POST' },
  });
}

export function removeModelCredential(credentialId: string): Promise<void> {
  return apiRequest({
    path: `/model-credentials/${credentialId}`,
    schema: ModelCredentialViewSchema.nullable(),
    init: { method: 'DELETE' },
  }).then(() => undefined);
}

function sendCredential<T extends CreateModelCredentialInput | UpdateModelCredentialInput>(
  path: string,
  method: 'POST' | 'PATCH',
  input: T,
) {
  return apiRequest({
    path,
    schema: ModelCredentialViewSchema,
    init: { method, body: JSON.stringify(input) },
  });
}
