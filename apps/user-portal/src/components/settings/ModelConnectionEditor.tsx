'use client';

import { useState, type FormEvent } from 'react';
import type { ModelCredentialView } from '@interview-agent/contracts';
import { createModelCredential, updateModelCredential } from '@/lib/model-credentials-api';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  MODEL_PROVIDER_OPTIONS,
  optionalBaseUrl,
  validateModelConnection,
  type ModelConnectionDraft,
} from './model-connection-form';

type ModelConnectionEditorProps = {
  credential: ModelCredentialView | null;
  initialDraft: ModelConnectionDraft;
  onCancel: () => void;
  onSaved: (saved: ModelCredentialView) => void;
};

export function ModelConnectionEditor({
  credential,
  initialDraft,
  onCancel,
  onSaved,
}: ModelConnectionEditorProps) {
  const form = useConnectionEditor(credential, initialDraft, onSaved);
  return (
    <form className="credential-editor" onSubmit={(event) => void form.submit(event)}>
      <EditorHeader existing={form.existing} />
      <ConnectionFields draft={form.draft} existing={form.existing} update={form.update} />
      <EditorActions busy={form.busy} message={form.message} onCancel={onCancel} />
    </form>
  );
}

function useConnectionEditor(
  credential: ModelCredentialView | null,
  initialDraft: ModelConnectionDraft,
  onSaved: (saved: ModelCredentialView) => void,
) {
  const notifications = useNotifications();
  const [draft, setDraft] = useState(initialDraft);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const existing = credential !== null;
  const update = (patch: Partial<ModelConnectionDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = validateModelConnection({ ...draft, existing });
    if (Object.keys(errors).length) {
      const issue = Object.values(errors)[0] ?? '请检查填写内容。';
      setMessage(issue);
      notifications.error('模型连接未保存', new Error(issue), issue);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const saved = existing
        ? await updateModelCredential(credential.id, updateInput(draft))
        : await createModelCredential(createInput(draft));
      onSaved(saved);
      notifications.success(
        existing ? '模型连接已更新' : '模型连接已保存',
        '服务端已加密保存密钥；请完成连接测试后再用于 Agent 任务。',
      );
    } catch (reason) {
      setMessage(messageOf(reason));
      notifications.error('模型连接保存失败', reason, '模型连接没有保存，请稍后重试。');
    } finally {
      setBusy(false);
    }
  };
  return { busy, draft, existing, message, submit, update };
}

function EditorHeader({ existing }: { existing: boolean }) {
  return (
    <div className="credential-editor-heading">
      <strong>{existing ? '更新模型连接' : '添加模型连接'}</strong>
      <span>API Key 只会在本次保存时发送。</span>
    </div>
  );
}

function ConnectionFields({
  draft,
  existing,
  update,
}: {
  draft: ModelConnectionDraft;
  existing: boolean;
  update: (patch: Partial<ModelConnectionDraft>) => void;
}) {
  return (
    <>
      <ProviderAndModelFields draft={draft} existing={existing} update={update} />
      <EndpointAndKeyFields draft={draft} existing={existing} update={update} />
      <DefaultModelField checked={draft.isDefault ?? false} update={update} />
    </>
  );
}

function ProviderAndModelFields({ draft, existing, update }: FieldProps) {
  return (
    <div className="settings-field-grid">
      <label className="label">
        Provider
        <select
          className="input"
          value={draft.provider}
          disabled={existing}
          onChange={(event) =>
            update({ provider: event.target.value as ModelConnectionDraft['provider'] })
          }
        >
          {MODEL_PROVIDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        模型名称
        <input
          className="input"
          value={draft.model}
          onChange={(event) => update({ model: event.target.value })}
          placeholder="例如 deepseek-chat"
        />
      </label>
    </div>
  );
}

function EndpointAndKeyFields({ draft, existing, update }: FieldProps) {
  return (
    <>
      <label className="label">
        Base URL（仅自定义端点必填）
        <input
          className="input"
          value={draft.baseUrl}
          onChange={(event) => update({ baseUrl: event.target.value })}
          placeholder="https://api.example.com/v1"
        />
      </label>
      <label className="label">
        {existing ? '更新 API Key（留空则不替换）' : 'API Key'}
        <input
          className="input"
          type="password"
          value={draft.apiKey}
          onChange={(event) => update({ apiKey: event.target.value })}
          autoComplete="new-password"
          placeholder={existing ? '留空保持现有密钥' : '仅在这里粘贴一次'}
        />
      </label>
    </>
  );
}

function DefaultModelField({
  checked,
  update,
}: {
  checked: boolean;
  update: FieldProps['update'];
}) {
  return (
    <label className="settings-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => update({ isDefault: event.target.checked })}
      />
      设为默认模型，用于下一次模拟面试
    </label>
  );
}

type FieldProps = {
  draft: ModelConnectionDraft;
  existing: boolean;
  update: (patch: Partial<ModelConnectionDraft>) => void;
};

function EditorActions({
  busy,
  message,
  onCancel,
}: {
  busy: boolean;
  message: string;
  onCancel: () => void;
}) {
  return (
    <div className="row-between">
      <span className="settings-error" aria-live="polite">
        {message}
      </span>
      <span className="settings-actions">
        <button className="button secondary" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="button" type="submit" disabled={busy}>
          {busy ? '保存中…' : '加密保存连接'}
        </button>
      </span>
    </div>
  );
}

function createInput(draft: ModelConnectionDraft) {
  return {
    provider: draft.provider,
    model: draft.model.trim(),
    apiKey: draft.apiKey.trim(),
    baseUrl: optionalBaseUrl(draft.baseUrl),
    isDefault: draft.isDefault ?? false,
  };
}

function updateInput(draft: ModelConnectionDraft) {
  return {
    model: draft.model.trim(),
    baseUrl: optionalBaseUrl(draft.baseUrl) ?? null,
    isDefault: draft.isDefault ?? false,
    ...(draft.apiKey.trim() ? { apiKey: draft.apiKey.trim() } : {}),
  };
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : '操作失败，请稍后重试。';
}
