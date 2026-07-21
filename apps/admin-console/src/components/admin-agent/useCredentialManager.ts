import type { ModelCredentialView } from '@interview-agent/contracts';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { listAdminModelCredentials } from '@/lib/admin-page-agent-api';
import type { CredentialEditor } from './model-credential-manager.types';

export function useCredentialManager(open: boolean, onChanged: () => Promise<void>) {
  const [credentials, setCredentials] = useState<ModelCredentialView[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editor, setEditor] = useState<CredentialEditor>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setCredentials(await listAdminModelCredentials());
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '模型连接列表加载失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const completeChange = useCallback(async () => {
    await Promise.all([reload(), onChanged()]);
  }, [onChanged, reload]);
  return { busyId, completeChange, credentials, editor, loading, reload, setBusyId, setEditor };
}
