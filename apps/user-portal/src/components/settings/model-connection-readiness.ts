import type { ModelCredentialView } from '@interview-agent/contracts';
import type { SettingsReturnTarget } from './settings-return-target';

export type ModelConnectionNextAction = {
  href: '/questions' | SettingsReturnTarget['href'];
  label: '返回题库继续组卷' | '返回本轮练习' | '返回本轮面试';
  notice:
    | '默认模型已就绪，可以返回题库继续组卷。'
    | '默认模型已就绪，可以返回本轮练习继续评价。'
    | '默认模型已就绪，可以返回本轮面试继续作答。';
};

export type ModelConnectionReadiness =
  | { kind: 'empty'; defaultCredential: null }
  | {
      kind: 'ready';
      defaultCredential: ModelCredentialView;
      nextAction: ModelConnectionNextAction;
    }
  | { kind: 'needs_action'; defaultCredential: ModelCredentialView | null };

export function modelConnectionReadiness(
  credentials: ModelCredentialView[],
  returnTarget: SettingsReturnTarget | null = null,
): ModelConnectionReadiness {
  const defaultCredential = credentials.find((credential) => credential.isDefault) ?? null;
  if (credentials.length === 0) return { kind: 'empty', defaultCredential: null };
  if (defaultCredential?.status === 'verified') {
    return {
      kind: 'ready',
      defaultCredential,
      nextAction: nextActionFor(returnTarget),
    };
  }
  return { kind: 'needs_action', defaultCredential };
}

function nextActionFor(returnTarget: SettingsReturnTarget | null): ModelConnectionNextAction {
  if (returnTarget?.kind === 'interview') {
    return {
      href: returnTarget.href,
      label: '返回本轮面试',
      notice: '默认模型已就绪，可以返回本轮面试继续作答。',
    };
  }
  if (returnTarget) {
    return {
      href: returnTarget.href,
      label: '返回本轮练习',
      notice: '默认模型已就绪，可以返回本轮练习继续评价。',
    };
  }
  return {
    href: '/questions',
    label: '返回题库继续组卷',
    notice: '默认模型已就绪，可以返回题库继续组卷。',
  };
}
