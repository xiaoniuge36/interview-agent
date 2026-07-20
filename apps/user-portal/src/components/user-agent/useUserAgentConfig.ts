import { useCallback, useEffect, useState } from 'react';
import { getUserPageAgentConfig, type UserPageAgentConfig } from '@/lib/user-page-agent-api';

export function useUserAgentConfig() {
  const [config, setConfig] = useState<UserPageAgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setConfig(await getUserPageAgentConfig());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法读取刷题教练配置。');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => void reload(), [reload]);
  return { config, loading, error, reload };
}
