type CredentialActionInput<T> = {
  action: () => Promise<T>;
  refresh: () => Promise<boolean>;
};

export type CredentialActionResult<T> = {
  result: T;
  synchronizationComplete: boolean;
};

export type CredentialActionOutcome = {
  tone: 'success' | 'info';
  message: string;
  notificationDetail: string;
};

export function createExclusiveCredentialActionRunner() {
  let running = false;
  return async function run(action: () => Promise<void>): Promise<boolean> {
    if (running) return false;
    running = true;
    try {
      await action();
      return true;
    } finally {
      running = false;
    }
  };
}

export async function runCredentialAction<T>(
  input: CredentialActionInput<T>,
): Promise<CredentialActionResult<T>> {
  const result = await input.action();
  let synchronizationComplete = false;
  try {
    synchronizationComplete = await input.refresh();
  } catch {
    synchronizationComplete = false;
  }
  return { result, synchronizationComplete };
}

export function credentialActionOutcome(
  kind: 'test' | 'remove',
  synchronizationComplete: boolean,
): CredentialActionOutcome {
  if (kind === 'test' && synchronizationComplete) {
    return successOutcome('连接测试成功，已可用于 Agent 任务。', '服务端已完成真实模型调用验证。');
  }
  if (kind === 'remove' && synchronizationComplete) {
    return successOutcome('模型连接已删除。', '服务端已移除该加密凭据。');
  }
  return kind === 'test'
    ? {
        tone: 'info',
        message: '连接测试已成功，列表状态将在下次刷新时继续同步。',
        notificationDetail: '模型已通过真实调用验证；列表状态稍后继续同步。',
      }
    : {
        tone: 'info',
        message: '模型连接已删除，列表状态将在下次刷新时继续同步。',
        notificationDetail: '服务端已删除该连接；列表状态稍后继续同步。',
      };
}

function successOutcome(message: string, notificationDetail: string): CredentialActionOutcome {
  return { tone: 'success', message, notificationDetail };
}
