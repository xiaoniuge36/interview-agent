import type { ModelCredentialView } from '@interview-agent/contracts';

export type ModelConnectionReadiness = {
  kind: 'empty' | 'ready' | 'needs_action';
  defaultCredential: ModelCredentialView | null;
};

export function modelConnectionReadiness(
  credentials: ModelCredentialView[],
): ModelConnectionReadiness {
  const defaultCredential = credentials.find((credential) => credential.isDefault) ?? null;
  if (credentials.length === 0) return { kind: 'empty', defaultCredential: null };
  if (defaultCredential?.status === 'verified') return { kind: 'ready', defaultCredential };
  return { kind: 'needs_action', defaultCredential };
}
