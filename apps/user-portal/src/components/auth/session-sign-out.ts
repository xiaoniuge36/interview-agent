import { createExclusiveAccessActionRunner } from './access-action-single-flight';

const runExclusiveSignOut = createExclusiveAccessActionRunner();

export function runSessionSignOut(action: () => Promise<void>): Promise<boolean> {
  return runExclusiveSignOut(action);
}
