import type { ModelCredentialView } from '@interview-agent/contracts';

export type CredentialEditor = ModelCredentialView | 'create' | null;

export type CredentialActionHandlers = {
  completeChange: () => Promise<void>;
  setBusyId: (value: string | null) => void;
};
