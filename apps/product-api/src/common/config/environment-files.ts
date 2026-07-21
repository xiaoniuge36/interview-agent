import { resolve } from 'node:path';

export function localEnvironmentFiles(currentDirectory: string, preserveEnvironment: string | undefined) {
  if (preserveEnvironment === 'true') return [];
  return [resolve(currentDirectory, '.env'), resolve(currentDirectory, '../../.env')];
}
