import { redactSensitiveText } from '../../common/security/sensitive-data';

export function maskPageAgentText(value: string) {
  return redactSensitiveText(value);
}
