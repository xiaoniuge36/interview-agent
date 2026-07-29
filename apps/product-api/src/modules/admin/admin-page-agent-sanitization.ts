import { redactSensitiveText } from '../../common/security/sensitive-data';

export function maskAdminPageAgentText(value: string) {
  return redactSensitiveText(value);
}
