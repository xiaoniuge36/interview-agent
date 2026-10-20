'use client';

import { useCallback, useRef, useState } from 'react';
import type { AvailableModel } from '@interview-agent/contracts';
import { discoverAvailableModels } from '@/lib/model-credentials-api';
import {
  modelCatalogBlocker,
  modelCatalogInput,
  type ModelConnectionDraft,
} from './model-connection-form';

export type ModelCatalogState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; models: AvailableModel[] }
  | { kind: 'failed'; message: string };

const EMPTY_CATALOG = '服务商没有返回可用模型，请稍后重试或手动填写模型名称。';

/**
 * 读取服务商的模型目录，让用户从返回列表里直接挑选模型，而不是手写模型名称。
 * 已保存的连接复用服务端保存的密钥，新建连接则使用表单里填写的 API Key。
 */
export function useModelCatalog(draft: ModelConnectionDraft, credentialId: string | null) {
  const [state, setState] = useState<ModelCatalogState>({ kind: 'idle' });
  const inFlight = useRef(false);
  const fetchModels = useCallback(async () => {
    if (inFlight.current) return;
    const blocked = modelCatalogBlocker(draft, credentialId);
    if (blocked) {
      setState({ kind: 'failed', message: blocked });
      return;
    }
    inFlight.current = true;
    setState({ kind: 'loading' });
    try {
      const models = await discoverAvailableModels(modelCatalogInput(draft, credentialId));
      setState(
        models.length > 0 ? { kind: 'ready', models } : { kind: 'failed', message: EMPTY_CATALOG },
      );
    } catch (reason) {
      setState({ kind: 'failed', message: messageOf(reason) });
    } finally {
      inFlight.current = false;
    }
  }, [credentialId, draft]);
  const reset = useCallback(() => setState({ kind: 'idle' }), []);
  return { state, fetchModels, reset };
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : '获取模型列表失败，请稍后重试。';
}
