import Link from 'next/link';
import type { ModelCredentialView } from '@interview-agent/contracts';
import {
  modelConnectionReadiness,
  type ModelConnectionNextAction,
} from './model-connection-readiness';
import type { SettingsReturnTarget } from './settings-return-target';

type ModelReadinessBannerProps = {
  credentials: ModelCredentialView[];
  returnTarget?: SettingsReturnTarget | null;
  onAdd: () => void;
};

export function ModelReadinessBanner({
  credentials,
  returnTarget = null,
  onAdd,
}: ModelReadinessBannerProps) {
  const readiness = modelConnectionReadiness(credentials, returnTarget);
  if (readiness.kind === 'empty') return <EmptyReadiness onAdd={onAdd} />;
  if (readiness.kind === 'ready')
    return (
      <ReadyReadiness credential={readiness.defaultCredential} nextAction={readiness.nextAction} />
    );
  return <NeedsActionReadiness credential={readiness.defaultCredential} />;
}

function EmptyReadiness({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="model-readiness-banner" data-state="empty">
      <div>
        <span>训练前检查</span>
        <strong>还没有可用的默认模型</strong>
        <p>添加并测试一条模型连接后，才可以开始 AI 评价和模拟面试。</p>
      </div>
      <button className="button" type="button" onClick={onAdd}>
        添加模型连接
      </button>
    </section>
  );
}

function ReadyReadiness({
  credential,
  nextAction,
}: {
  credential: ModelCredentialView;
  nextAction: ModelConnectionNextAction;
}) {
  return (
    <section className="model-readiness-banner" data-state="ready">
      <div>
        <span>训练前检查</span>
        <strong>默认模型已就绪</strong>
        <p>{credential.model} 可用于 AI 评价和模拟面试。</p>
      </div>
      <div className="model-readiness-actions">
        <small>上次测试：{formatTestedAt(credential.lastTestedAt)}</small>
        <Link className="button" href={nextAction.href}>
          {nextAction.label}
        </Link>
      </div>
    </section>
  );
}

function NeedsActionReadiness({ credential }: { credential: ModelCredentialView | null }) {
  const copy = credential
    ? `请在连接卡中重新测试 ${credential.model}，再用于 Agent 任务。`
    : '请在编辑器中选择一条连接作为默认模型，再开始 Agent 任务。';
  return (
    <section className="model-readiness-banner" data-state="needs_action">
      <div>
        <span>训练前检查</span>
        <strong>还需要完成一项检查</strong>
        <p>{copy}</p>
      </div>
    </section>
  );
}

function formatTestedAt(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(value))
    : '尚未测试';
}
