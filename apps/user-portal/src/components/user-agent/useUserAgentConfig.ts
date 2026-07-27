import { useCallback, useEffect, useState } from 'react';
import { getUserPageAgentConfig, type UserPageAgentConfig } from '@/lib/user-page-agent-api';
import { createLatestUserAgentConfigRequest } from './user-agent-config-request';

export function useUserAgentConfig() {
  const [config, setConfig] = useState<UserPageAgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request] = useState(createLatestUserAgentConfigRequest);
  const reload = useCallback(async () => {
    setLoading(true);
    await request.run({
      load: getUserPageAgentConfig,
      onSuccess: (nextConfig) => {
        setConfig(nextConfig);
        setError(null);
      },
      onError: (reason) => {
        setError(reason instanceof Error ? reason.message : '无法读取刷题教练配置。');
      },
      onSettled: () => setLoading(false),
    });
  }, [request]);
  useEffect(() => {
    void reload();
    return request.invalidate;
  }, [reload, request]);
  return { config, loading, error, reload };
}
