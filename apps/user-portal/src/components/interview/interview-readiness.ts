import type { ModelCredentialView } from '@interview-agent/contracts';

export function hasUsableInterviewModel(credentials: ModelCredentialView[]) {
  return credentials.some((credential) => credential.isDefault && credential.status === 'verified');
}
