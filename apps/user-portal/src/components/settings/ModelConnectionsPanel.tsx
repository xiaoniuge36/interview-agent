'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModelCredentialView } from '@interview-agent/contracts';
import { listModelCredentials } from '@/lib/model-credentials-api';
import { ModelConnectionEditor } from './ModelConnectionEditor';
import { ModelCredentialCard } from './ModelCredentialCard';
import { ModelReadinessBanner } from './ModelReadinessBanner';
import { emptyModelConnection, type ModelConnectionDraft } from './model-connection-form';
import { modelConnectionReadiness } from './model-connection-readiness';
import { createLatestRequestRunner } from '@interview-agent/api-client';
import {
  settingsReturnTargetFromSearch,
  type SettingsReturnTarget,
} from './settings-return-target';

type EditorState = { credential: ModelCredentialView | null; draft: ModelConnectionDraft };

export function ModelConnectionsPanel({ createRequest = 0 }: { createRequest?: number }) {
  const [returnTarget, setReturnTarget] = useState<SettingsReturnTarget | null>(null);
  useEffect(() => setReturnTarget(settingsReturnTargetFromSearch(window.location.search)), []);
  const controller = usePanelController(createRequest, returnTarget);

  return <ModelConnectionsView controller={controller} returnTarget={returnTarget} />;
}

function ModelConnectionsView({
  controller,
  returnTarget,
}: {
  controller: ReturnType<typeof usePanelController>;
  returnTarget: SettingsReturnTarget | null;
}) {
  return (
    <section className="model-connections-panel" aria-labelledby="model-settings-heading">
      <ModelConnectionsHeader />
      {controller.loading ? (
        <p className="model-readiness-loading" role="status">
          正在检查默认模型状态…
        </p>
      ) : null}
      {!controller.loading && !controller.error ? (
        <ModelReadinessBanner credentials={controller.credentials} returnTarget={returnTarget} />
      ) : null}
      {controller.editor ? (
        <ModelConnectionEditor
          credential={controller.editor.credential}
          initialDraft={controller.editor.draft}
          onCancel={() => controller.setEditor(null)}
          onSaved={controller.onSaved}
        />
      ) : null}
      <ModelCredentialList controller={controller} />
      <p className="security-note">
        <span aria-hidden="true">♢</span>密钥已加密保存，只会用于你的 Agent
        任务。你可以随时更新或删除连接。
      </p>
      {controller.notice ? (
        <p className="settings-notice" aria-live="polite">
          {controller.notice}
        </p>
      ) : null}
    </section>
  );
}

function ModelCredentialList({
  controller,
}: {
  controller: ReturnType<typeof usePanelController>;
}) {
  return (
    <div className="credential-list" aria-live="polite">
      {controller.credentials.map((credential) => (
        <ModelCredentialCard
          key={credential.id}
          credential={credential}
          {...controller.credentialActions}
          onEdit={() => controller.setEditor(editEditor(credential))}
        />
      ))}
      {controller.credentials.length === 0 && !controller.error ? (
        <EmptyConnections onAdd={() => controller.setEditor(newEditor())} />
      ) : null}
      {controller.error ? <p className="settings-error">{controller.error}</p> : null}
    </div>
  );
}

function ModelConnectionsHeader() {
  return (
    <div className="model-panel-heading">
      <div>
        <h2 id="model-settings-heading" className="h2">
          AI 模型连接
        </h2>
        <p>添加你自己的模型连接。密钥只会在保存时提交一次，页面始终只显示脱敏信息。</p>
      </div>
    </div>
  );
}

function usePanelController(createRequest: number, returnTarget: SettingsReturnTarget | null) {
  const { credentials, error, loading, refresh, setCredentials } = useConnections();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState('');
  const lastCreateRequest = useRef(createRequest);
  useEffect(() => {
    if (createRequest === lastCreateRequest.current) return;
    lastCreateRequest.current = createRequest;
    setEditor(newEditor());
  }, [createRequest]);
  const onSaved = useCallback(
    (saved: ModelCredentialView) => {
      setCredentials((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setEditor(null);
      setNotice('模型连接已加密保存。下一步：测试这条连接后再用于 Agent 任务。');
    },
    [setCredentials],
  );
  const onUpdated = useCallback(
    (updated: ModelCredentialView) => {
      setCredentials((items) =>
        items.map((credential) => (credential.id === updated.id ? updated : credential)),
      );
      const readiness = modelConnectionReadiness([updated], returnTarget);
      setNotice(readiness.kind === 'ready' ? readiness.nextAction.notice : '');
    },
    [returnTarget, setCredentials],
  );
  const onRemoved = useCallback(
    (credentialId: string) => {
      setCredentials((items) => items.filter((credential) => credential.id !== credentialId));
    },
    [setCredentials],
  );
  return {
    credentialActions: { onRefresh: refresh, onRemoved, onUpdated },
    credentials,
    editor,
    error,
    loading,
    notice,
    onRemoved,
    onSaved,
    onUpdated,
    refresh,
    setEditor,
  };
}

function useConnections() {
  const [credentials, setCredentials] = useState<ModelCredentialView[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [request] = useState(createLatestRequestRunner);
  const refresh = useCallback(() => {
    setLoading(true);
    return request.run({
      load: listModelCredentials,
      onSuccess: (items) => {
        setCredentials(items);
        setError('');
      },
      onError: (reason) => setError(messageOf(reason)),
      onSettled: () => setLoading(false),
    });
  }, [request]);
  useEffect(() => {
    void refresh();
    return request.invalidate;
  }, [refresh, request]);
  return { credentials, error, loading, refresh, setCredentials };
}

function EmptyConnections({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="credential-empty">
      <strong>还没有 AI 模型连接</strong>
      <p>连接一个模型后，Interview Agent 才能基于你的档案开始真实模拟。</p>
      <button className="button secondary" type="button" onClick={onAdd}>
        连接第一个模型
      </button>
    </div>
  );
}

function newEditor(): EditorState {
  return { credential: null, draft: emptyModelConnection() };
}

function editEditor(credential: ModelCredentialView): EditorState {
  return {
    credential,
    draft: {
      provider: credential.provider,
      model: credential.model,
      baseUrl: credential.baseUrl ?? '',
      apiKey: '',
      isDefault: credential.isDefault,
      existing: true,
    },
  };
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : '操作失败，请稍后重试。';
}
