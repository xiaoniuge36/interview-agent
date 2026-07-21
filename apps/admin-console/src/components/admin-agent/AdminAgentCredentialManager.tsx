'use client';

import type { ModelCredentialView } from '@interview-agent/contracts';
import {
  deleteCredential,
  setDefaultCredential,
  testCredential,
  toggleCredential,
} from './model-credential-manager-actions';
import { CredentialManagerDialog, MODEL_CREDENTIAL_MANAGER_COPY } from './CredentialManagerDialog';
import { ModelCredentialForm } from './ModelCredentialForm';
import { useCredentialManager } from './useCredentialManager';

type Props = { open: boolean; onClose: () => void; onChanged: () => Promise<void> };

export { MODEL_CREDENTIAL_MANAGER_COPY };

export function AdminAgentCredentialManager({ open, onClose, onChanged }: Props) {
  const manager = useCredentialManager(open, onChanged);
  const handlers = { completeChange: manager.completeChange, setBusyId: manager.setBusyId };
  const action =
    (operation: (credential: ModelCredentialView) => Promise<void>) =>
    (credential: ModelCredentialView) =>
      void operation(credential);
  return (
    <>
      <CredentialManagerDialog
        busyId={manager.busyId}
        credentials={manager.credentials}
        loading={manager.loading}
        open={open}
        onClose={onClose}
        onCreate={() => manager.setEditor('create')}
        onDelete={action((credential) => deleteCredential(credential, handlers))}
        onEdit={manager.setEditor}
        onReload={() => void manager.reload()}
        onSetDefault={action((credential) => setDefaultCredential(credential, handlers))}
        onTest={action((credential) => testCredential(credential, handlers))}
        onToggle={action((credential) => toggleCredential(credential, handlers))}
      />
      <ModelCredentialForm
        credential={manager.editor === 'create' ? undefined : (manager.editor ?? undefined)}
        open={manager.editor !== null}
        onClose={() => manager.setEditor(null)}
        onCompleted={manager.completeChange}
      />
    </>
  );
}
