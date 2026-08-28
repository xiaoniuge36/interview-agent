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
};

export function ModelReadinessBanner({ credentials, returnTarget = null }: ModelReadinessBannerProps) {
  const readiness = modelConnectionReadiness(credentials, returnTarget);
  // 零连接时不重复提示：下方的连接空态卡已承担“连接第一个模型”的完整引导。
  if (readiness.kind === 'empty') return null;
  if (readiness.kind === 'ready')
    return (
      <ReadyReadiness credential={readiness.defaultCredential} nextAction={readiness.nextAction} />
    );
  return <NeedsActionReadiness credential={readiness.defaultCredential} />;
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
