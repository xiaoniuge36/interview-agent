'use client';

import { useState } from 'react';
import type { ModelCredentialView } from '@interview-agent/contracts';
import { removeModelCredential, testModelCredential } from '@/lib/model-credentials-api';
import { MODEL_PROVIDER_OPTIONS } from './model-connection-form';

type ModelCredentialCardProps = {
  credential: ModelCredentialView;
  onChanged: () => Promise<void>;
  onEdit: () => void;
};

export function ModelCredentialCard({ credential, onChanged, onEdit }: ModelCredentialCardProps) {
  const { busy, remove, test } = useCredentialActions(credential.id, onChanged);
  return (
    <article className="credential-card">
      <CredentialHeader credential={credential} onEdit={onEdit} busy={busy} />
      <CredentialFacts credential={credential} />
      <CredentialActions onEdit={onEdit} onRemove={remove} onTest={test} busy={busy} />
    </article>
  );
}

function useCredentialActions(id: string, onChanged: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const test = async () => {
    setBusy(true);
    try {
      await testModelCredential(id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm('删除后 Agent 将不能再使用此模型连接，确定继续吗？')) return;
    setBusy(true);
    try {
      await removeModelCredential(id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  return { busy, remove, test };
}

function CredentialHeader({
  credential,
  onEdit,
  busy,
}: {
  credential: ModelCredentialView;
  onEdit: () => void;
  busy: boolean;
}) {
  const label = providerLabel(credential.provider);
  return (
    <header className="credential-card-header">
      <div className="credential-provider">
        <span className="provider-badge">{label.slice(0, 1).toUpperCase()}</span>
        <strong>{label}</strong>
        <span className={`credential-status ${credential.status}`}>
          {statusLabel(credential.status)}
        </span>
      </div>
      <button
        className="credential-more"
        type="button"
        aria-label={`编辑 ${label} 连接`}
        onClick={onEdit}
        disabled={busy}
      >
        ⋮
      </button>
    </header>
  );
}

function CredentialFacts({ credential }: { credential: ModelCredentialView }) {
  const testedAt = credential.lastTestedAt
    ? new Date(credential.lastTestedAt).toLocaleString()
    : '尚未测试';
  return (
    <div className="credential-facts">
      <CredentialFact label="模型名称" value={credential.model} />
      <CredentialFact label="密钥" value={credential.keyHint} secret />
      <CredentialFact label="上次测试时间" value={testedAt} />
    </div>
  );
}

function CredentialFact({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong className={secret ? 'credential-key-hint' : undefined}>
        {value}
        {secret ? <i aria-hidden="true">◉</i> : null}
      </strong>
    </div>
  );
}

function CredentialActions({
  onEdit,
  onRemove,
  onTest,
  busy,
}: {
  onEdit: () => void;
  onRemove: () => Promise<void>;
  onTest: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <footer className="credential-actions">
      <button
        className="connection-action"
        type="button"
        onClick={() => void onTest()}
        disabled={busy}
      >
        ◌ 测试连接
      </button>
      <button className="connection-action" type="button" onClick={onEdit} disabled={busy}>
        ⌕ 更新密钥
      </button>
      <button
        className="connection-action danger"
        type="button"
        onClick={() => void onRemove()}
        disabled={busy}
      >
        ⌫ 删除连接
      </button>
    </footer>
  );
}

function providerLabel(provider: ModelCredentialView['provider']) {
  return MODEL_PROVIDER_OPTIONS.find((item) => item.value === provider)?.label ?? provider;
}

function statusLabel(status: ModelCredentialView['status']) {
  return { verified: '连接正常', unverified: '待测试', disabled: '已停用', failed: '连接失败' }[
    status
  ];
}
