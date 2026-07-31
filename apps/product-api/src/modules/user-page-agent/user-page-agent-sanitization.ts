import { redactSensitiveText } from '../../common/security/sensitive-data';

export function maskUserPageAgentText(value: string) {
  return redactSensitiveText(value);
}
