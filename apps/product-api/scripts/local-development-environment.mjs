import { existsSync, readFileSync } from 'node:fs';

const ENV_ASSIGNMENT = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;

export function loadLocalDevelopmentEnvironment(parentEnvironment, environmentFile) {
  if (!existsSync(environmentFile)) return { ...parentEnvironment };

  const fileEnvironment = {};
  for (const line of readFileSync(environmentFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(ENV_ASSIGNMENT);
    if (!match) continue;
    fileEnvironment[match[1]] = normalizeEnvironmentValue(match[2]);
  }
  return { ...parentEnvironment, ...fileEnvironment };
}

function normalizeEnvironmentValue(value) {
  const quotedValue = value.match(/^(['"])(.*)\1$/);
  return quotedValue ? quotedValue[2] : value;
}
