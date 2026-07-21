import type { ModelCredentialView } from '@interview-agent/contracts';
import { message } from 'antd';
import {
  deleteAdminModelCredential,
  testAdminModelCredential,
  updateAdminModelCredential,
} from '@/lib/admin-page-agent-api';
import type { CredentialActionHandlers } from './model-credential-manager.types';

type CredentialActionOptions = CredentialActionHandlers & {
  action: () => Promise<unknown>;
  credential: ModelCredentialView;
  success: string;
};

export function testCredential(
  credential: ModelCredentialView,
  handlers: CredentialActionHandlers,
) {
  return runCredentialAction({
    ...handlers,
    credential,
    action: () => testAdminModelCredential(credential.id),
    success: '模型连接测试通过。',
  });
}

export function setDefaultCredential(
  credential: ModelCredentialView,
  handlers: CredentialActionHandlers,
) {
  return runCredentialAction({
    ...handlers,
    credential,
    action: () => updateAdminModelCredential(credential.id, { isDefault: true }),
    success: '已设为默认模型。',
  });
}

export function toggleCredential(
  credential: ModelCredentialView,
  handlers: CredentialActionHandlers,
) {
  const status = credential.status === 'disabled' ? 'unverified' : 'disabled';
  return runCredentialAction({
    ...handlers,
    credential,
    action: () => updateAdminModelCredential(credential.id, { status }),
    success: status === 'disabled' ? '模型连接已停用。' : '模型连接已启用，请重新测试。',
  });
}

export function deleteCredential(
  credential: ModelCredentialView,
  handlers: CredentialActionHandlers,
) {
  return runCredentialAction({
    ...handlers,
    credential,
    action: () => deleteAdminModelCredential(credential.id),
    success: '模型连接已删除。',
  });
}

async function runCredentialAction({
  action,
  completeChange,
  credential,
  setBusyId,
  success,
}: CredentialActionOptions) {
  setBusyId(credential.id);
  try {
    await action();
    await completeChange();
    message.success(success);
  } catch (cause) {
    message.error(cause instanceof Error ? cause.message : '模型连接操作失败。');
  } finally {
    setBusyId(null);
  }
}
