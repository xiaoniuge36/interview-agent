/**
 * 模型服务商错误码 → 用户可读原因。
 * 原始码保留在括号里便于反馈排障，但不允许把裸码作为唯一信息展示给用户。
 */
const CREDENTIAL_ERROR_LABELS: Record<string, string> = {
  MODEL_PROVIDER_AUTH_FAILED: '密钥无效或已过期',
  MODEL_PROVIDER_RATE_LIMITED: '服务商限流，请稍后再试',
  MODEL_PROVIDER_TIMEOUT: '连接服务商超时',
  MODEL_PROVIDER_UNAVAILABLE: '服务商暂时不可用',
  MODEL_PROVIDER_ENDPOINT_BLOCKED: '接入地址不在允许范围',
  MODEL_PROVIDER_RESPONSE_INVALID: '服务商返回了异常数据',
};

export function credentialErrorLabel(code: string): string {
  const label = CREDENTIAL_ERROR_LABELS[code];
  return label ? `${label}（${code}）` : `连接失败（${code}）`;
}
