const MAX_SAFE_PREVIEW_LENGTH = 256;
const SENSITIVE_FIELD_PATTERN =
  /answer|password|passcode|api[_ -]?key|secret|token|authorization|completion|credential|prompt/i;

export function redactSensitiveText(value: string): string {
  return value
    .replace(/(api[_ -]?key|secret|password|token)\s*[:=]\s*[^\s,;]+/gi, '$1=[已隐藏]')
    .replace(/\b(?:sk|rk)-[A-Za-z0-9_-]{8,}\b/g, '[已隐藏]')
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [已隐藏]')
    .replace(/\b(1[3-9]\d)\d{4}(\d{4})\b/g, '$1****$2')
    .replace(/\b([a-zA-Z0-9._%+-])[^@\s]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, '$1***$2');
}

export function safeTextPreview(value: string, maxLength = MAX_SAFE_PREVIEW_LENGTH): string {
  return redactSensitiveText(value).slice(0, maxLength);
}

export function isSensitiveField(key: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(key);
}
