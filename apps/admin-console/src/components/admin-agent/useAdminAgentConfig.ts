import { useCallback, useEffect, useState } from 'react';
import { getAdminPageAgentConfig, type AdminPageAgentConfig } from '@/lib/admin-page-agent-api';

export function useAdminAgentConfig(enabled: boolean) {
  const [config, setConfig] = useState<AdminPageAgentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConfig(await getAdminPageAgentConfig());
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const refresh = () => void load();
    window.addEventListener('admin-agent-config-refresh', refresh);
    return () => window.removeEventListener('admin-agent-config-refresh', refresh);
  }, [enabled, load]);

  return { config, loading, reloadConfig: load };
}
